const db = require("../db");
const { KAFKA_STATUS } = require("../../constants/kafka");
const { connectProducer } = require("./client");

// publishEvent
// Send Kafka event to topic and mark status as completed in database
const publishEvent = async ({ eventId, topic, eventType, payload }) => {
  const producer = await connectProducer();

  await producer.send({
    topic,
    messages: [
      {
        key: eventId,
        value: JSON.stringify({
          event_id: eventId,
          event_type: eventType,
          topic,
          payload,
          emitted_at: new Date().toISOString(),
        }),
      },
    ],
  });

  await db.query("UPDATE kafka_event SET status = $1 WHERE event_id = $2", [
    KAFKA_STATUS.COMPLETED,
    eventId,
  ]);
};

module.exports = {
  publishEvent,
};
