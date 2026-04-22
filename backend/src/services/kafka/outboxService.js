const db = require("../db");
const { KAFKA_STATUS } = require("../../constants/kafka");

const ensureKafkaMetadata = async (executor, topic, sourceSystem) => {
  await executor.query(
    `
      INSERT INTO system (system_name, system_type, is_active)
      VALUES ($1, 'both', true)
      ON CONFLICT (system_name) DO NOTHING
    `,
    [sourceSystem],
  );

  await executor.query(
    `
      INSERT INTO kafka_topic (topic_name, description, partition_count, replication_factor)
      VALUES ($1, $2, 1, 1)
      ON CONFLICT (topic_name) DO NOTHING
    `,
    [topic, `${topic} event topic`],
  );
};

const createOutboxEvent = async ({
  eventType,
  topic,
  payload,
  sourceSystem,
  client,
}) => {
  const executor = client || db;
  await ensureKafkaMetadata(executor, topic, sourceSystem);
  const result = await executor.query(
    `
      INSERT INTO kafka_event (event_type, topic, source_system, payload, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [eventType, topic, sourceSystem, payload, KAFKA_STATUS.PENDING],
  );

  return result.rows[0];
};

const leasePendingEvents = async (limit = 25) => {
  const result = await db.query(
    `
      UPDATE kafka_event
      SET status = $1
      WHERE event_id IN (
        SELECT event_id
        FROM kafka_event
        WHERE status = $2
        ORDER BY created_at ASC
        LIMIT $3
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `,
    [KAFKA_STATUS.PROCESSING, KAFKA_STATUS.PENDING, limit],
  );

  return result.rows;
};

const markEventFailed = async (eventId) => {
  await db.query("UPDATE kafka_event SET status = $1 WHERE event_id = $2", [
    KAFKA_STATUS.FAILED,
    eventId,
  ]);
};

module.exports = {
  createOutboxEvent,
  leasePendingEvents,
  markEventFailed,
};
