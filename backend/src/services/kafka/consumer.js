const { connectConsumer, ensureTopics } = require("./client");
const { KAFKA_TOPICS } = require("../../constants/kafka");
const { handleEvent } = require("../../handlers/kafka/eventHandlers");
const { setKafkaState } = require("./state");

// sleep
// Utility function for async delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// shouldRetryStartup
// Determine if Kafka startup error is transient and can be retried
const shouldRetryStartup = (error) => {
  const message = String(error?.message || "");

  return (
    message.includes("group coordinator is not available") ||
    message.includes("broker not available") ||
    message.includes("Connection refused") ||
    message.includes("The coordinator is not available") ||
    message.includes("Request is not valid given the current SASL state") ||
    message.includes("Not authorized to access topics")
  );
};

// startConsumerOnce
// Initialize Kafka consumer, subscribe to topics, and start message processing
const startConsumerOnce = async () => {
  await ensureTopics();
  const consumer = await connectConsumer();

  for (const topic of Object.values(KAFKA_TOPICS)) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  // Subscribe to admin feedback topic
  try {
    await consumer.subscribe({
      topic: "admin.temperature-feedback",
      fromBeginning: false,
    });
  } catch (err) {
    console.warn(
      "Failed to subscribe to admin.temperature-feedback:",
      err.message,
    );
  }

  setKafkaState({ consumerReady: true, lastError: null });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) {
        return;
      }

      const event = JSON.parse(message.value.toString("utf8"));
      await handleEvent(event);
    },
  });
};

const startConsumer = async () => {
  setKafkaState({ consumerReady: false, lastError: null });

  const maxAttempts = Number(process.env.KAFKA_STARTUP_RETRIES) || 8;
  const retryDelayMs = Number(process.env.KAFKA_STARTUP_RETRY_DELAY_MS) || 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await startConsumerOnce();
      return;
    } catch (error) {
      setKafkaState({ consumerReady: false, lastError: error.message });

      if (attempt === maxAttempts || !shouldRetryStartup(error)) {
        throw error;
      }

      console.warn(
        `Kafka consumer startup attempt ${attempt} failed: ${error.message}. Retrying in ${retryDelayMs}ms...`,
      );
      await sleep(retryDelayMs);
    }
  }
};

module.exports = {
  startConsumer,
};
