const { Kafka } = require("kafkajs");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("./db");
const { recordTemperatureLog } = require("./auditService");
const { classifyStatus } = require("./temperatureClassifier");

const getBrokers = () =>
  (process.env.KAFKA_BROKERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const isEnabled = (value) => {
  if (value === undefined) {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const readSecret = (filePath, envValue, fallbackNames = []) => {
  if (envValue) {
    return envValue;
  }

  const candidates = [filePath, ...fallbackNames]
    .filter(Boolean)
    .map((candidate) =>
      path.isAbsolute(candidate)
        ? candidate
        : path.resolve(process.cwd(), candidate),
    );

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8");
    }
  }

  return undefined;
};

const getSslConfig = () => {
  if (!isEnabled(process.env.KAFKA_SSL)) {
    return undefined;
  }

  const sslConfig = {};
  const ca = readSecret(
    process.env.KAFKA_CA_CERT_PATH,
    process.env.KAFKA_CA_CERT,
    ["ca.pem", "../ca.pem", "../../ca.pem"],
  );
  const cert = readSecret(
    process.env.KAFKA_CLIENT_CERT_PATH,
    process.env.KAFKA_CLIENT_CERT,
    ["service.cert", "../service.cert", "../../service.cert"],
  );
  const key = readSecret(
    process.env.KAFKA_CLIENT_KEY_PATH,
    process.env.KAFKA_CLIENT_KEY,
    ["service.key", "../service.key", "../../service.key"],
  );

  if (ca) sslConfig.ca = [ca];
  if (cert) sslConfig.cert = cert;
  if (key) sslConfig.key = key;
  if (process.env.KAFKA_CLIENT_KEY_PASSPHRASE) {
    sslConfig.passphrase = process.env.KAFKA_CLIENT_KEY_PASSPHRASE;
  }

  return Object.keys(sslConfig).length > 0 ? sslConfig : true;
};

const getSaslConfig = () => {
  const hasCertificateAuth =
    Boolean(process.env.KAFKA_CA_CERT_PATH || process.env.KAFKA_CA_CERT) ||
    Boolean(
      process.env.KAFKA_CLIENT_CERT_PATH || process.env.KAFKA_CLIENT_CERT,
    ) ||
    Boolean(process.env.KAFKA_CLIENT_KEY_PATH || process.env.KAFKA_CLIENT_KEY);

  if (hasCertificateAuth) {
    return undefined;
  }

  const user = process.env.KAFKA_SASL_USERNAME || process.env.KAFKA_USERNAME;
  const pass = process.env.KAFKA_SASL_PASSWORD || process.env.KAFKA_PASSWORD;

  if (!user || !pass) return undefined;

  return {
    mechanism: process.env.KAFKA_SASL_MECHANISM || "plain",
    username: user,
    password: pass,
  };
};

let running = false;
let consumer;
let producer;

const sensorLastStatus = new Map(); // sensor_id -> lastStatus

const startTemperatureProcessor = async () => {
  if (running) return;
  const brokers = getBrokers();
  if (!brokers.length) {
    console.warn(
      "[temperature-processor] No KAFKA_BROKERS configured; temperature processor disabled",
    );
    return;
  }

  const ssl = getSslConfig();
  const sasl = getSaslConfig();

  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "admin-temperature-processor",
    brokers,
    ...(ssl ? { ssl } : {}),
    ...(sasl ? { sasl } : {}),
  });

  consumer = kafka.consumer({
    groupId: process.env.TEMP_CONSUMER_GROUP || "admin-temperature-processor",
  });
  producer = kafka.producer();

  await Promise.all([consumer.connect(), producer.connect()]);

  await consumer.subscribe({
    topic: process.env.TANIM_TEMPERATURE_TOPIC || "tanim.temperature",
    fromBeginning: false,
  });

  running = true;

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message?.value) return;

      let event;
      try {
        event = JSON.parse(message.value.toString("utf8"));
      } catch (err) {
        console.warn("[temperature-processor] invalid message JSON, skipping");
        return;
      }

      const sensorId = event.sensor_id || event.sensorId;
      const roomId = event.room_id || event.roomId;
      const temp = Number(event.temp_celsius ?? event.tempCelsius ?? NaN);

      if (!sensorId || !roomId || Number.isNaN(temp)) {
        console.warn(
          "[temperature-processor] missing sensor/room/temp in event, skipping",
        );
        return;
      }

      // Fetch room thresholds from DB
      let roomRow;
      try {
        const res = await db.query(
          "SELECT optimal_temp, temp_start, temp_end FROM room WHERE room_id = $1 LIMIT 1",
          [roomId],
        );
        roomRow = res.rows[0];
      } catch (err) {
        console.warn(
          "[temperature-processor] DB error fetching room thresholds:",
          err.message,
        );
      }

      const optimal = Number(roomRow?.optimal_temp ?? 24);
      const start = Number(roomRow?.temp_start ?? optimal - 3);
      const end = Number(roomRow?.temp_end ?? optimal + 3);
      const thresholdSource = roomRow ? "room" : "default";

      const status = classifyStatus(temp, optimal, start, end);

      try {
        await recordTemperatureLog({
          sensorId,
          roomId,
          payload: {
            entity: "temperature_reading",
            event_id: event.event_id || event.source_event_id || null,
            sensor_id: sensorId,
            room_id: roomId,
            temperature_celsius: temp,
            optimal_temp: optimal,
            temp_start: start,
            temp_end: end,
            threshold_source: thresholdSource,
            source_type: event.source_type || "simulated",
            status,
            source: event.source || "tanim.temperature",
            recorded_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error(
          "[temperature-processor] Failed to record temperature audit log:",
          err.message,
        );
      }

      const previous = sensorLastStatus.get(sensorId) || null;

      // Only escalate when entering critical/danger from a non-critical/danger state
      const isEscalation =
        (status === "critical" || status === "danger") &&
        !(previous === "critical" || previous === "danger");

      sensorLastStatus.set(sensorId, status);

      if (!isEscalation) {
        return;
      }

      const escalationLevel = status === "danger" ? 2 : 1;

      const feedbackEvent = {
        event_id: randomUUID(),
        event_type: "TemperatureEscalation",
        topic: process.env.ADMIN_FEEDBACK_TOPIC || "admin.temperature-feedback",
        source_system: "admin-system",
        emitted_at: new Date().toISOString(),
        payload: {
          source_event_id: event.event_id || event.source_event_id || null,
          sensor_id: sensorId,
          room_id: roomId,
          status,
          escalation_level: escalationLevel,
          timestamp: new Date().toISOString(),
          source: "admin-system",
        },
      };

      try {
        await producer.send({
          topic:
            process.env.ADMIN_FEEDBACK_TOPIC || "admin.temperature-feedback",
          messages: [{ key: sensorId, value: JSON.stringify(feedbackEvent) }],
        });

        console.log(
          `[temperature-processor] Published escalation for ${sensorId}: ${status}`,
        );
      } catch (err) {
        console.error(
          "[temperature-processor] Failed to publish escalation:",
          err.message,
        );
      }
    },
  });
};

const stopTemperatureProcessor = async () => {
  running = false;
  try {
    if (consumer) await consumer.disconnect();
  } catch (e) {}
  try {
    if (producer) await producer.disconnect();
  } catch (e) {}
};

module.exports = {
  startTemperatureProcessor,
  stopTemperatureProcessor,
};
