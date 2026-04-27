const { Kafka, logLevel } = require("kafkajs");
const fs = require("fs");
const path = require("path");

const KAFKA_TOPICS = ["tanim.seeds", "tanim.transactions", "tanim.alerts"];

let kafka;
let consumer;
let consumerReady = false;
let lastError = null;
let lastEvent = null;

const getBrokers = () =>
  (process.env.KAFKA_BROKERS || "")
    .split(",")
    .map((broker) => broker.trim())
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
    ["ca.pem"],
  );
  const cert = readSecret(
    process.env.KAFKA_CLIENT_CERT_PATH,
    process.env.KAFKA_CLIENT_CERT,
    ["service.cert"],
  );
  const key = readSecret(
    process.env.KAFKA_CLIENT_KEY_PATH,
    process.env.KAFKA_CLIENT_KEY,
    ["service.key"],
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

  const username =
    process.env.KAFKA_SASL_USERNAME || process.env.KAFKA_USERNAME;
  const password =
    process.env.KAFKA_SASL_PASSWORD || process.env.KAFKA_PASSWORD;

  if (!username || !password) {
    return undefined;
  }

  return {
    mechanism: process.env.KAFKA_SASL_MECHANISM || "plain",
    username,
    password,
  };
};

const createKafkaClient = () => {
  if (!kafka) {
    const ssl = getSslConfig();
    const sasl = getSaslConfig();

    kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || "admin-system",
      brokers: getBrokers(),
      logLevel:
        process.env.KAFKA_LOG_LEVEL === "debug"
          ? logLevel.DEBUG
          : logLevel.INFO,
      ...(ssl ? { ssl } : {}),
      ...(sasl ? { sasl } : {}),
    });
  }

  return kafka;
};

const getConsumer = () => {
  if (!consumer) {
    consumer = createKafkaClient().consumer({
      groupId: process.env.KAFKA_CONSUMER_GROUP_ID || "admin-system-consumer",
    });
  }

  return consumer;
};

const getKafkaState = () => ({
  consumerReady,
  lastError,
  lastEvent,
});

const startKafkaConsumer = async () => {
  if (!getBrokers().length) {
    lastError = "Kafka brokers are not configured";
    return;
  }

  const currentConsumer = getConsumer();
  await currentConsumer.connect();

  for (const topic of KAFKA_TOPICS) {
    await currentConsumer.subscribe({ topic, fromBeginning: false });
  }

  consumerReady = true;
  lastError = null;

  await currentConsumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) {
        return;
      }

      const parsed = JSON.parse(message.value.toString("utf8"));
      lastEvent = {
        topic,
        receivedAt: new Date().toISOString(),
        payload: parsed,
      };
      console.log(`[admin-system] event received on ${topic}`);
    },
  });
};

const disconnectKafka = async () => {
  if (consumer) {
    await consumer.disconnect().catch(() => undefined);
  }

  consumerReady = false;
};

module.exports = {
  startKafkaConsumer,
  disconnectKafka,
  getKafkaState,
};
