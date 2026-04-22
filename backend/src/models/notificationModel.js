const db = require("../services/db");

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

  async createGerminationReminder(userId, seedId, message) {
    const query = `
      INSERT INTO notification (
        user_id, notification_type, message, seed_id, is_read, created_at
      )
      VALUES ($1, $2, $3, $4, false, NOW())
      RETURNING *
    `;
    const result = await db.query(query, [
      userId,
      "germination_reminder",
      message,
      seedId,
    ]);
    return result.rows[0];
  },
};

module.exports = NotificationModel;
