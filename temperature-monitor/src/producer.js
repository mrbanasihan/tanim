const { Kafka } = require("kafkajs");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
const { KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_TOPIC } = require("./config");

// producer
// Kafka producer for publishing temperature readings to tanim.temperature topic; handles SSL/SASL authentication
// readSecret
// Read secret file from environment path or fallback locations
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

// parseSsl
// Parse and load SSL/TLS certificate configuration from environment
const parseSsl = () => {
  if (
    !["true", "1", "yes", "on"].includes(
      String(process.env.KAFKA_SSL || "").toLowerCase(),
    )
  )
    return undefined;
  const ssl = {};
  if (process.env.KAFKA_CA_CERT_PATH || process.env.KAFKA_CA_CERT) {
    const ca = readSecret(
      process.env.KAFKA_CA_CERT_PATH,
      process.env.KAFKA_CA_CERT,
      ["ca.pem", "../ca.pem", "../../ca.pem"],
    );
    if (ca) ssl.ca = [ca];
  }
  if (process.env.KAFKA_CLIENT_CERT_PATH || process.env.KAFKA_CLIENT_CERT) {
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
    if (cert) ssl.cert = cert;
    if (key) ssl.key = key;
  }
  return Object.keys(ssl).length ? ssl : true;
};

const parseSasl = () => {
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

const sslConfig = parseSsl();
const saslConfig = parseSasl();

const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKERS,
  ...(sslConfig ? { ssl: sslConfig } : {}),
  ...(saslConfig ? { sasl: saslConfig } : {}),
});

const createTemperatureProducer = async () => {
  const producer = kafka.producer();
  await producer.connect();

  const publishTemperatureReading = async (reading) => {
    const payload = {
      event_id: reading.event_id || randomUUID(),
      source_event_id: reading.source_event_id || randomUUID(),
      sensor_id: reading.sensor_id,
      room_id: reading.room_id,
      room_name: reading.room_name || null,
      sensor_name: reading.sensor_name || null,
      source_type: reading.source_type || "simulated",
      source: "temperature-monitor",
      temp_celsius: reading.temp_celsius,
      humidity_percent: reading.humidity_percent,
      measured_at: reading.measured_at || new Date().toISOString(),
    };

    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [
        {
          key: payload.sensor_id,
          value: JSON.stringify(payload),
        },
      ],
    });

    return payload;
  };

  const shutdown = async () => {
    await producer.disconnect();
  };

  return {
    publishTemperatureReading,
    shutdown,
  };
};

module.exports = {
  createTemperatureProducer,
};
