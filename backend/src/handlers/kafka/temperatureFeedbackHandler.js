/**
 * Temperature Feedback Handler
 * Processes temperature escalation alerts from admin-system
 * Consumes from admin.temperature-feedback Kafka topic
 */

const db = require("../../services/db");
const NotificationModel = require("../../models/notificationModel");

/**
 * Check if event has already been processed (idempotency)
 */
const ensureEventIdempotency = async (sourceEventId) => {
  const result = await db.query(
    `SELECT 1 FROM audit_log WHERE source_event_id = $1 LIMIT 1`,
    [sourceEventId],
  );

  return result.rowCount === 0; // Return true if NOT found (event is new)
};

/**
 * Create audit entry and publish user notifications for the escalation.
 */
const createNotification = async (payload, sourceEventId) => {
  // Check idempotency
  if (!(await ensureEventIdempotency(sourceEventId))) {
    console.log(`[FeedbackHandler] Event already processed: ${sourceEventId}`);
    return;
  }

  // Insert into audit log
  const auditPayload = {
    sensor_id: payload.sensor_id,
    room_id: payload.room_id,
    status: payload.status,
    escalation_level: payload.escalation_level,
    source: "admin-system",
  };

  await db.query(
    `
      INSERT INTO audit_log (action_type, actor, entity_type, entity_id, payload, source_event_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      "UPDATE",
      "admin-system",
      "sensor_data",
      payload.sensor_id,
      auditPayload,
      sourceEventId,
    ],
  );

  const notificationMessage = `Room temperature sensor (${payload.sensor_id}) reported ${payload.status.toUpperCase()} status. Current reading requires immediate attention.`;

  const recipients = await db.query(
    `
      SELECT user_id
      FROM "user"
      WHERE role IN ('admin', 'researcher') AND is_active = true
    `,
  );

  for (const recipient of recipients.rows) {
    await NotificationModel.createNotificationEvent({
      userId: recipient.user_id,
      notificationType: "temperature_alert",
      message: notificationMessage,
      payload: {
        room_id: payload.room_id,
        sensor_id: payload.sensor_id,
        status: payload.status,
        escalation_level: payload.escalation_level,
        source: "admin-system",
      },
    });
  }
};

/**
 * Handle TemperatureEscalation event from admin-system
 * Payload structure:
 * {
 *   source_event_id: string (UUID),
 *   sensor_id: string (UUID),
 *   room_id: string (UUID),
 *   status: "critical" | "danger",
 *   escalation_level: number (1-5 or similar),
 *   timestamp: ISO timestamp
 * }
 */
const handleTemperatureEscalation = async (event) => {
  try {
    const payload = event.payload;
    const sourceEventId = event.event_id;

    console.log(
      `[FeedbackHandler] Processing escalation: ${payload.status} for sensor ${payload.sensor_id}`,
    );

    // Create notification and audit log entry
    await createNotification(payload, sourceEventId);

    console.log(`[FeedbackHandler] Escalation processed successfully`);
  } catch (error) {
    console.error("[FeedbackHandler] Error processing escalation:", error);
    throw error;
  }
};

module.exports = {
  handleTemperatureEscalation,
};
