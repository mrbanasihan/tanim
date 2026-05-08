const db = require("../services/db");
const {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
  KAFKA_SOURCE_SYSTEM,
} = require("../constants/kafka");
const { createOutboxEvent } = require("../services/kafka/outboxService");

const ensureSeedLotColumns = async () => {
  await db.query(`
    ALTER TABLE seed_lot
    ADD COLUMN IF NOT EXISTS moisture_content DECIMAL(5, 2)
  `);

  await db.query(`
    ALTER TABLE seed_lot
    ADD COLUMN IF NOT EXISTS area_planted VARCHAR(255)
  `);
  await db.query(`
    ALTER TABLE seed_lot
    ADD COLUMN IF NOT EXISTS storage_area VARCHAR(255)
  `);
};

const SeedModel = {
  async getAll(filters = {}) {
    try {
      await ensureSeedLotColumns();

      let query = `
            SELECT s.*, p.project_name as project_name,
              CASE
                WHEN to_regclass('public.room') IS NOT NULL THEN (
                  SELECT room_name FROM room WHERE room_id::text = s.storage_area LIMIT 1
                )
                WHEN to_regclass('public.rooms') IS NOT NULL THEN (
                  SELECT name FROM rooms WHERE room_id::text = s.storage_area LIMIT 1
                )
                ELSE NULL
              END AS storage_area_name
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
    } catch (error) {
      console.error("SeedModel.getAll error:", error);
      throw error;
    }
  },

  async getById(seedId) {
    try {
      await ensureSeedLotColumns();

      const query = `
            SELECT s.*, p.project_name as project_name,
              CASE
                WHEN to_regclass('public.room') IS NOT NULL THEN (
                  SELECT room_name FROM room WHERE room_id::text = s.storage_area LIMIT 1
                )
                WHEN to_regclass('public.rooms') IS NOT NULL THEN (
                  SELECT name FROM rooms WHERE room_id::text = s.storage_area LIMIT 1
                )
                ELSE NULL
              END AS storage_area_name
            FROM seed_lot s
            LEFT JOIN project p ON s.project_id = p.project_id
            WHERE s.seed_id = $1 AND s.is_active = true
        `;
      const result = await db.query(query, [seedId]);
      return result.rows[0];
    } catch (error) {
      console.error("SeedModel.getById error:", error);
      throw error;
    }
  },

  async create(data) {
    await ensureSeedLotColumns();

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
              moisture_content, gross_weight, cleaned_quantity, current_quantity,
              date_received, area_planted, storage_area, remarks, is_active, created_by, created_at
            )
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14, NOW())
            RETURNING *
      `;
      const result = await client.query(query, [
        data.project_id || null,
        batchName,
        data.crop_type,
        data.variety,
        data.classification,
        data.moisture_content,
        data.gross_weight,
        data.cleaned_quantity || null,
        data.cleaned_quantity || data.gross_weight,
        null,
        data.area_planted || null,
        data.storage_area || null,
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
    await ensureSeedLotColumns();

    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query(
        `
          SELECT seed_id, gross_weight, cleaned_quantity, current_quantity
          FROM seed_lot
          WHERE seed_id = $1
          FOR UPDATE
        `,
        [seedId],
      );

      const existingSeed = existingResult.rows[0];
      if (!existingSeed) {
        await client.query("ROLLBACK");
        return null;
      }

      const previousBaseline =
        existingSeed.cleaned_quantity ?? existingSeed.gross_weight ?? 0;
      const nextBaseline = data.cleaned_quantity ?? data.gross_weight ?? 0;
      const consumedQuantity = previousBaseline - existingSeed.current_quantity;

      if (nextBaseline < consumedQuantity) {
        throw new Error(
          "Updated cleaned weight cannot be less than the quantity already transacted",
        );
      }

      const nextCurrentQuantity = nextBaseline - consumedQuantity;

      const query = `
        UPDATE seed_lot
        SET project_id = $1,
            crop_type = $2,
            variety = $3,
            classification = $4,
            moisture_content = $5,
            gross_weight = $6,
            cleaned_quantity = $7,
            current_quantity = $8,
            date_received = $9,
            area_planted = $10,
            storage_area = $11,
            remarks = $12
        WHERE seed_id = $13
        RETURNING *
    `;
      const result = await client.query(query, [
        data.project_id || null,
        data.crop_type,
        data.variety,
        data.classification,
        data.moisture_content,
        data.gross_weight || 0,
        data.cleaned_quantity || null,
        nextCurrentQuantity,
        null,
        data.area_planted || null,
        data.storage_area || null,
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
