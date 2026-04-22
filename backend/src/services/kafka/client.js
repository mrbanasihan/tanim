const { Kafka, logLevel } = require("kafkajs");
const fs = require("fs");
const path = require("path");
const { KAFKA_TOPICS } = require("../../constants/kafka");
const { setKafkaState } = require("./state");

let kafka;
let producer;
let consumer;
let admin;
let producerConnected = false;
let consumerConnected = false;
let adminConnected = false;

const getBrokers = () =>
  (process.env.KAFKA_BROKERS || "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);

const getBooleanEnv = (value) => {
  if (value === undefined) {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const readFileIfPresent = (filePath) => {
  if (!filePath) {
    return undefined;
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  return fs.readFileSync(resolvedPath, "utf8");
};

const getSslConfig = () => {
  if (!getBooleanEnv(process.env.KAFKA_SSL)) {
    return undefined;
  }

  const sslConfig = {};
  const ca = readFileIfPresent(process.env.KAFKA_CA_CERT_PATH);
  const cert = readFileIfPresent(process.env.KAFKA_CLIENT_CERT_PATH);
  const key = readFileIfPresent(process.env.KAFKA_CLIENT_KEY_PATH);

  if (ca) {
    sslConfig.ca = [ca];
  }

  if (cert) {
    sslConfig.cert = cert;
  }

  if (key) {
    sslConfig.key = key;
  }

  if (process.env.KAFKA_CLIENT_KEY_PASSPHRASE) {
    sslConfig.passphrase = process.env.KAFKA_CLIENT_KEY_PASSPHRASE;
  }

  return Object.keys(sslConfig).length > 0 ? sslConfig : true;
};

const getSaslConfig = () => {
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
      clientId: process.env.KAFKA_CLIENT_ID || "tanim-backend",
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

const getProducer = () => {
  if (!producer) {
    producer = createKafkaClient().producer();
  }

  return producer;
};

const getConsumer = () => {
  if (!consumer) {
    consumer = createKafkaClient().consumer({
      groupId: process.env.KAFKA_CONSUMER_GROUP_ID || "tanim-backend-consumer",
    });
  }

  return consumer;
};

const getAdmin = () => {
  if (!admin) {
    admin = createKafkaClient().admin();
  }

  return admin;
};

const ensureTopics = async () => {
  const autoCreateTopics =
    process.env.KAFKA_AUTO_CREATE_TOPICS === undefined
      ? process.env.NODE_ENV !== "production"
      : getBooleanEnv(process.env.KAFKA_AUTO_CREATE_TOPICS);

  if (!autoCreateTopics) {
    return;
  }

  const kafkaAdmin = getAdmin();

  if (!adminConnected) {
    await kafkaAdmin.connect();
    adminConnected = true;
  }

  const existingTopics = await kafkaAdmin.listTopics();
  const requiredTopics = Object.values(KAFKA_TOPICS).filter(
    (topic) => !existingTopics.includes(topic),
  );

  if (requiredTopics.length > 0) {
    await kafkaAdmin.createTopics({
      topics: requiredTopics.map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1,
      })),
      waitForLeaders: true,
    });
  }
};

const connectProducer = async () => {
  const currentProducer = getProducer();

  if (!producerConnected) {
    await currentProducer.connect();
    producerConnected = true;
  }

  setKafkaState({ producerReady: true, lastError: null });
  return currentProducer;
};

const connectConsumer = async () => {
  const currentConsumer = getConsumer();

  if (!consumerConnected) {
    await currentConsumer.connect();
    consumerConnected = true;
  }

  return currentConsumer;
};

const disconnectAdmin = async () => {
  if (admin) {
    await admin.disconnect().catch(() => undefined);
  }

  adminConnected = false;
};

const connectAdmin = async () => {
  const kafkaAdmin = getAdmin();

  if (!adminConnected) {
    await kafkaAdmin.connect();
    adminConnected = true;
  }

  return kafkaAdmin;
};

const disconnectKafka = async () => {
  const tasks = [];

  if (producer) {
    tasks.push(producer.disconnect().catch(() => undefined));
  }

  if (consumer) {
    tasks.push(consumer.disconnect().catch(() => undefined));
  }

  if (admin) {
    tasks.push(disconnectAdmin());
  }

  await Promise.all(tasks);
  producerConnected = false;
  consumerConnected = false;
  adminConnected = false;
  setKafkaState({
    producerReady: false,
    consumerReady: false,
    workerReady: false,
  });
};

module.exports = {
  createKafkaClient,
  getProducer,
  getConsumer,
  getAdmin,
  connectAdmin,
  ensureTopics,
  connectProducer,
  connectConsumer,
  disconnectKafka,
};
