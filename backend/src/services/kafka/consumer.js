const { connectConsumer, ensureTopics } = require("./client");
const { KAFKA_TOPICS } = require("../../constants/kafka");
const { handleEvent } = require("../../handlers/kafka/eventHandlers");
const { setKafkaState } = require("./state");

const startConsumer = async () => {
  setKafkaState({ consumerReady: false, lastError: null });

  try {
    await ensureTopics();
    const consumer = await connectConsumer();

    for (const topic of Object.values(KAFKA_TOPICS)) {
      await consumer.subscribe({ topic, fromBeginning: false });
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
  } catch (error) {
    setKafkaState({ consumerReady: false, lastError: error.message });
    throw error;
  }
};

module.exports = {
  startConsumer,
};
