const db = require("../services/db");
const {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
  KAFKA_SOURCE_SYSTEM,
} = require("../constants/kafka");
const { createOutboxEvent } = require("../services/kafka/outboxService");

const SeedModel = {
  async getAll(filters = {}) {
    let query = `
            SELECT s.*, p.project_name as project_name
            FROM seed_lot s
            LEFT JOIN project p ON s.project_id = p.project_id
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

    if (filters.project_id) {
      query += ` AND s.project_id = $${paramIndex++}`;
      params.push(filters.project_id);
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
            WHERE s.seed_id = $1 AND s.is_active = true
        `;
    const result = await db.query(query, [seedId]);
    return result.rows[0];
  },

  async create(data) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // Generate batch_name
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      let batchName = `${year}-${month}`;

      if (data.project_id) {
        const projectQuery = `SELECT project_code FROM project WHERE project_id = $1`;
        const projectResult = await client.query(projectQuery, [
          data.project_id,
        ]);
        if (projectResult.rows[0] && projectResult.rows[0].project_code) {
          batchName += `-${projectResult.rows[0].project_code}`;
        }
      }
      batchName += `-${data.crop_type}-${data.variety}`;

      const query = `
            INSERT INTO seed_lot (
                seed_id, project_id, batch_name, crop_type, variety, classification,
                gross_weight, cleaned_quantity, current_quantity,
                date_received, remarks, is_active, created_by, created_at
            )
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, NOW())
            RETURNING *
      `;
      const result = await client.query(query, [
        data.project_id || null,
        batchName,
        data.crop_type,
        data.variety,
        data.classification,
        data.gross_weight,
        data.cleaned_quantity || null,
        data.cleaned_quantity || data.gross_weight,
        null,
        data.remarks || null,
        data.created_by,
      ]);

      const seed = result.rows[0];

      await createOutboxEvent({
        eventType: KAFKA_EVENTS.SEED_REGISTERED,
        topic: KAFKA_TOPICS.SEEDS,
        payload: {
          actor: data.created_by,
          seed_id: seed.seed_id,
          project_id: seed.project_id,
          crop_type: seed.crop_type,
          variety: seed.variety,
          classification: seed.classification,
          gross_weight: seed.gross_weight,
          current_quantity: seed.current_quantity,
        },
        sourceSystem: KAFKA_SOURCE_SYSTEM,
        client,
      });

      await client.query("COMMIT");
      return seed;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async update(seedId, data) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const query = `
        UPDATE seed_lot
        SET project_id = $1,
            crop_type = $2,
            variety = $3,
            classification = $4,
            gross_weight = $5,
            cleaned_quantity = $6,
            current_quantity = $7,
            date_received = $8,
            remarks = $9
        WHERE seed_id = $10
        RETURNING *
    `;
      const result = await client.query(query, [
        data.project_id || null,
        data.crop_type,
        data.variety,
        data.classification,
        data.gross_weight || 0,
        data.cleaned_quantity || null,
        data.cleaned_quantity || data.gross_weight || 0,
        null,
        data.remarks || null,
        seedId,
      ]);

      const seed = result.rows[0];

      if (seed) {
        await createOutboxEvent({
          eventType: KAFKA_EVENTS.SEED_UPDATED,
          topic: KAFKA_TOPICS.SEEDS,
          payload: {
            actor: data.updated_by || data.created_by || null,
            seed_id: seed.seed_id,
            project_id: seed.project_id,
            crop_type: seed.crop_type,
            variety: seed.variety,
            classification: seed.classification,
            gross_weight: seed.gross_weight,
            current_quantity: seed.current_quantity,
          },
          sourceSystem: KAFKA_SOURCE_SYSTEM,
          client,
        });
      }

      await client.query("COMMIT");
      return seed;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
