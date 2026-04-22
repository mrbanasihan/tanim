const { Kafka, logLevel } = require("kafkajs");
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

const createKafkaClient = () => {
  if (!kafka) {
    kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || "tanim-backend",
      brokers: getBrokers(),
      logLevel:
        process.env.KAFKA_LOG_LEVEL === "debug"
          ? logLevel.DEBUG
          : logLevel.INFO,
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
