const db = require("../services/db");

const SeedModel = {
  async getAll(filters = {}) {
    let query = `
            SELECT s.*, p.project_name as project_name
            FROM seed_lot s
            LEFT JOIN project p ON s.project_id = p.project_id
            WHERE 1=1
        `;

    const params = [];
    let paramIndex = 1;

    if (filters.crop_type) {
      query += ` AND s.crop_type = $${paramIndex++}`;
      params.push(filters.crop_type);
    }

    if (filters.variety) {
      query += ` AND s.variety = $${paramIndex++}`;
      params.push(filters.variety);
    }

    if (filters.search) {
      query += ` AND (s.batch_name ILIKE $${paramIndex++} OR s.crop_type ILIKE $${paramIndex++} OR s.variety ILIKE $${paramIndex++})`;
      params.push(
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`,
      );
    }

    query += ` ORDER BY s.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  },

  async getById(seedId) {
    const query = `
            SELECT s.*, p.project_name as project_name
            FROM seed_lot s
            LEFT JOIN project p ON s.project_id = p.project_id
            WHERE s.seed_id = $1
        `;
    const result = await db.query(query, [seedId]);
    return result.rows[0];
  },

  async create(data) {
    // Generate batch_name
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    let batchName = `${year}-${month}`;

    if (data.project_id) {
      const projectQuery = `SELECT project_name FROM project WHERE project_id = $1`;
      const projectResult = await db.query(projectQuery, [data.project_id]);
      if (projectResult.rows[0]) {
        batchName += `-${projectResult.rows[0].project_name}`;
      }
    }
    batchName += `-${data.crop_type}-${data.variety}`;

    const query = `
            INSERT INTO seed_lot (
                seed_id, project_id, batch_name, crop_type, variety, classification,
                germination_rate, initial_quantity, cleaned_quantity, current_quantity,
                date_received, remarks, is_active, created_by, created_at
            )
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, NOW())
            RETURNING *
      `;
    const result = await db.query(query, [
      data.project_id || null,
      batchName,
      data.crop_type,
      data.variety,
      data.classification,
      data.germination_rate || null,
      data.initial_quantity,
      data.cleaned_quantity || null,
      data.cleaned_quantity || data.initial_quantity,
      null,
      data.remarks || null,
      data.created_by,
    ]);
    return result.rows[0];
  },

  async update(seedId, data) {
    const query = `
        UPDATE seed_lot
        SET project_id = $1,
            crop_type = $2,
            variety = $3,
            classification = $4,
            germination_rate = $5,
            initial_quantity = $6,
            cleaned_quantity = $7,
            current_quantity = $8,
            date_received = $9,
            remarks = $10,
            updated_at = NOW()
        WHERE seed_id = $11
        RETURNING *
    `;
    const result = await db.query(query, [
      data.project_id || null,
      data.crop_type,
      data.variety,
      data.classification,
      data.germination_rate || null,
      data.initial_quantity || 0,
      data.cleaned_quantity || null,
      data.cleaned_quantity || data.initial_quantity || 0,
      null,
      data.remarks || null,
      seedId,
    ]);
    return result.rows[0];
  },

  async delete(seedId) {
    const query = `
        DELETE FROM seed_lot
        WHERE seed_id = $1
        RETURNING seed_id
    `;
    const result = await db.query(query, [seedId]);
    return result.rows[0];
  },
};

module.exports = SeedModel;
