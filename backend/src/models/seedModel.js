const db = require("../services/db");

const SeedModel = {
  async getAl(filters = {}) {
    let query = `
            SELECT s.*, p.project_name
            FROM seed_lots s
            LEFT JOIN projects p ON s.project_id = p.project_id
            WHERE s.is_active = true
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

    if (filters.classification) {
      query += ` AND s.classification = $${paramIndex++}`;
      params.push(filters.classification);
    }

    if (filters.search) {
      query += ` AND (s.batch_nam ILIKE $${paramIndex++} OR s.crop_type ILIKE $${paramIndex++} OR s.variety ILIKE $${paramIndex++})`;
      params.push(
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`,
      );
    }

    query += ` ORDER BY s.created_at DESC`;

    // Pagination
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
            SELECT s.*, p.project_name
            FROM seed_lots s
            LEFT JOIN projects p ON s.project_id = p.project_id
            WHERE s.seed_id = $1 AND s.is_active = true
        `;
    const result = await db.query(query, [seedId]);
    return result.rows[0];
  },

  async create(data, createdBy) {
    const query = `
            INSERT INTO seed_lots (
                seed_id, project_id, batch_name, crop_type, variety, classification,
                germination_rate, initial_quantity, cleaned_quantity, current_quantity,
                date_received, remarks, is_active, created_by, created_at
            )
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, NOW())
            RETURNING *
      `;
    const result = await db.query(query, [
      data.projectId || null,
      data.batchName,
      data.cropType,
      data.variety,
      data.classification,
      data.germinationRate,
      data.initial_quantity,
      data.cleaned_quantity,
      data.current_quantity,
      data.current_quantity || data.initial_quantity,
      data.date_received,
      data.remarks,
      createdBy,
    ]);

    return result.rows[0];
  },

  async update(seedId, data) {
    const query = `
        UPDATE seed_lots 
        SET project_id = $1, batch_name = $2, crop_type = $3, variety = $4,
            classification = $5, germination_rate = $6, initial_quantity = $7,
            cleaned_quantity = $8, current_quantity = $9, date_received = $10,
            remarks = $11
        WHERE seed_id = $12 AND is_active = true
        RETURNING *
    `;
    const result = await db.query(query, [
      data.projectId || null,
      data.batchName,
      data.cropType,
      data.variety,
      data.classification,
      data.germinationRate,
      data.initial_quantity,
      data.cleaned_quantity,
      data.current_quantity,
      data.current_quantity || data.initial_quantity,
      data.date_received,
      data.remarks,
      seedId,
    ]);
    return result.rows[0];
  },

  async delete(seedId) {
    const query = `
        UPDATE seed_lots 
        SET is_active = false
        WHERE seed_id = $1
        RETURNING seed_id
    `;
    const result = await db.query(query, [seedId]);
    return result.rows[0];
  },

  async updateQuantity(seedId, new_quantity) {
    const query = `
        UPDATE seed_lots 
        SET current_quantity = $1
        WHERE seed_id = $2 AND is_active = true
        RETURNING *
    `;
    const result = await db.query(query, [new_quantity, seedId]);
    return result.rows[0];
  },
};

module.exports = SeedModel;
