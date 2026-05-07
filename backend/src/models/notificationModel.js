const db = require("../services/db");
const {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
  KAFKA_SOURCE_SYSTEM,
} = require("../constants/kafka");
const { createOutboxEvent } = require("../services/kafka/outboxService");

const NotificationModel = {
  async getByUserId(userId, filters = {}) {
    let query = `
      SELECT * FROM notification
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (filters.isRead !== undefined) {
      query += ` AND is_read = $${paramIndex++}`;
      params.push(filters.isRead);
    }

    query += ` ORDER BY created_at DESC`;
    const result = await db.query(query, params);
    return result.rows;
  },

  async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as count FROM notification
      WHERE user_id = $1 AND is_read = false
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0].count;
  },

  async markAsRead(notificationId) {
    const query = `
      UPDATE notification
      SET is_read = true
      WHERE notification_id = $1
      RETURNING *
    `;
    const result = await db.query(query, [notificationId]);
    return result.rows[0];
  },

  async markAllAsRead(userId) {
    const query = `
      UPDATE notification
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
      RETURNING *
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  },

  async delete(notificationId) {
    const query = `
      DELETE FROM notification
      WHERE notification_id = $1
      RETURNING notification_id
    `;
    const result = await db.query(query, [notificationId]);
    return result.rows[0];
  },

  async createNotificationEvent({
    userId,
    notificationType,
    message,
    seedId = null,
    payload = {},
    client,
  }) {
    return createOutboxEvent({
      eventType: KAFKA_EVENTS.NOTIFICATION_CREATED,
      topic: KAFKA_TOPICS.ALERTS,
      payload: {
        user_id: userId,
        notification_type: notificationType,
        message,
        seed_id: seedId,
        ...payload,
      },
      sourceSystem: KAFKA_SOURCE_SYSTEM,
      client,
    });
  },

  async createGerminationReminder(userId, seedId, message, client) {
    return this.createNotificationEvent({
      userId,
      notificationType: "germination_reminder",
      message,
      seedId,
      client,
    });
  },

  async createFromKafkaEvent({
    userId,
    notificationType,
    message,
    seedId = null,
    sourceEventId = null,
    createdAt = null,
  }) {
    const query = `
      INSERT INTO notification (
        user_id, notification_type, message, seed_id, is_read, created_at, source_event_id
      )
      VALUES ($1, $2, $3, $4, false, COALESCE($5, NOW()), $6)
      ON CONFLICT (source_event_id) DO NOTHING
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        userId,
        notificationType,
        message,
        seedId,
        createdAt,
        sourceEventId,
      ]);
      return result.rows[0];
    } catch (err) {
      // If the insert failed due to a foreign key constraint on user_id (user not present
      // in this system), retry inserting the notification with a NULL user_id so the
      // notification can still be recorded as a system-level event.
      // Postgres foreign key violation error code is '23503'.
      const pgForeignKeyViolation = err && err.code === "23503";
      if (pgForeignKeyViolation) {
        const fallbackQuery = `
          INSERT INTO notification (
            user_id, notification_type, message, seed_id, is_read, created_at, source_event_id
          )
          VALUES (NULL, $1, $2, $3, false, COALESCE($4, NOW()), $5)
          ON CONFLICT (source_event_id) DO NOTHING
          RETURNING *
        `;
        const fallbackResult = await db.query(fallbackQuery, [
          notificationType,
          message,
          seedId,
          createdAt,
          sourceEventId,
        ]);
        return fallbackResult.rows[0];
      }

      throw err;
    }
  },
};

module.exports = NotificationModel;
