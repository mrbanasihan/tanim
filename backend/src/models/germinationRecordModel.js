const db = require("../services/db");
const NotificationModel = require("./notificationModel");

const GerminationRecordModel = {
  async getAll(filters = {}) {
    let query = `
      SELECT gr.*, s.batch_name, s.crop_type, s.variety
      FROM germination_record gr
      LEFT JOIN seed_lot s ON gr.seed_id = s.seed_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.seed_id) {
      query += ` AND gr.seed_id = $${paramIndex++}`;
      params.push(filters.seed_id);
    }

    query += ` ORDER BY gr.created_at DESC`;
    const result = await db.query(query, params);
    return result.rows;
  },

  async getBySeedId(seedId) {
    const query = `
      SELECT gr.*, u.first_name, u.last_name
      FROM germination_record gr
      LEFT JOIN "user" u ON gr.created_by = u.user_id
      WHERE gr.seed_id = $1
      ORDER BY gr.created_at DESC
    `;
    const result = await db.query(query, [seedId]);
    return result.rows;
  },

  async getLatestBySeedId(seedId) {
    const query = `
      SELECT gr.*, u.first_name, u.last_name
      FROM germination_record gr
      LEFT JOIN "user" u ON gr.created_by = u.user_id
      WHERE gr.seed_id = $1
      ORDER BY gr.created_at DESC
      LIMIT 1
    `;
    const result = await db.query(query, [seedId]);
    return result.rows[0];
  },

  async create(data, userId) {
    const query = `
      INSERT INTO germination_record (
        seed_id, germination_rate, next_germination_date, created_by, created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const result = await db.query(query, [
      data.seed_id,
      data.germination_rate,
      data.next_germination_date || null,
      userId,
    ]);

    // Create notification for users if germination date is set
    if (data.next_germination_date) {
      await this.createGerminationNotification(
        data.seed_id,
        data.next_germination_date,
      );
    }

    return result.rows[0];
  },

  async delete(germinationId) {
    const query = `
      DELETE FROM germination_record
      WHERE germination_id = $1
      RETURNING germination_id
    `;
    const result = await db.query(query, [germinationId]);
    return result.rows[0];
  },

  async createGerminationNotification(seedId, nextDate) {
    // Get all admin and researcher users to notify
    const getUsersQuery = `
      SELECT user_id FROM "user"
      WHERE role IN ('admin', 'researcher')
    `;
    const usersResult = await db.query(getUsersQuery);

    // Get seed info for message
    const seedQuery = `
      SELECT batch_name FROM seed_lot WHERE seed_id = $1
    `;
    const seedResult = await db.query(seedQuery, [seedId]);
    const seedInfo = seedResult.rows[0];

    // Publish notifications for each user to Kafka
    for (const user of usersResult.rows) {
      await NotificationModel.createGerminationReminder(
        user.user_id,
        seedId,
        `Germination test scheduled for ${seedInfo.batch_name} on ${nextDate}`,
      );
    }
  },
};

module.exports = GerminationRecordModel;
