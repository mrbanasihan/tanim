const db = require("../services/db");
const {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
  KAFKA_SOURCE_SYSTEM,
} = require("../constants/kafka");
const { createOutboxEvent } = require("../services/kafka/outboxService");

const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 10);

const TransactionModel = {
  async getAll(filters = {}) {
    let query = `
      SELECT t.*, s.batch_name, s.crop_type, s.variety, u.first_name, u.last_name
      FROM transaction t
      JOIN seed_lot s ON t.seed_id = s.seed_id
      JOIN "user" u ON t.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.seed_id) {
      query += ` AND t.seed_id = $${paramIndex++}`;
      params.push(filters.seed_id);
    }
    if (filters.transaction_type) {
      query += ` AND t.transaction_type = $${paramIndex++}`;
      params.push(filters.transaction_type);
    }
    if (filters.type) {
      query += ` AND t.transaction_type = $${paramIndex++}`;
      params.push(filters.type);
    }
    if (filters.crop_type) {
      query += ` AND s.crop_type = $${paramIndex++}`;
      params.push(filters.crop_type);
    }
    if (filters.variety) {
      query += ` AND s.variety = $${paramIndex++}`;
      params.push(filters.variety);
    }
    if (filters.start_date) {
      query += ` AND t.created_at >= $${paramIndex++}`;
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ` AND t.created_at <= $${paramIndex++}`;
      params.push(filters.end_date);
    }

    if (filters.userRole === "guest" && filters.userId) {
      query += ` AND t.user_id = $${paramIndex++}`;
      params.push(filters.userId);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  },

  async getBySeedId(seedId, userRole, userId) {
    const query = `
      SELECT t.*, u.first_name, u.last_name
      FROM transaction t
      JOIN "user" u ON t.user_id = u.user_id
      WHERE t.seed_id = $1
      ${userRole === "guest" && userId ? "AND t.user_id = $2" : ""}
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(
      query,
      userRole === "guest" && userId ? [seedId, userId] : [seedId],
    );
    return result.rows;
  },

  // Distribution or Checkout
  async checkOut(
    seedId,
    userId,
    quantity,
    recipient,
    purpose,
    affiliation,
    contact,
    remarks,
  ) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const stockQuery = `SELECT current_quantity FROM seed_lot WHERE seed_id = $1 FOR UPDATE`;
      const stockResult = await client.query(stockQuery, [seedId]);

      if (!stockResult.rows[0]) {
        throw new Error("Seed lot not found");
      }

      const currentQuantity = parseFloat(stockResult.rows[0].current_quantity);
      const checkOutQuantity = parseFloat(quantity);

      if (checkOutQuantity > currentQuantity) {
        throw new Error("Insufficient stock");
      }

      const newBalance = currentQuantity - checkOutQuantity;

      await client.query(
        `UPDATE seed_lot SET current_quantity = $1 WHERE seed_id = $2`,
        [newBalance, seedId],
      );

      const transactionQuery = `
        INSERT INTO transaction (
          transaction_id, seed_id, user_id, transaction_type, quantity,
          balance_after, recipient, purpose, affiliation, contact, remarks, created_at
        )
        VALUES (gen_random_uuid(), $1, $2, 'outgoing', $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `;
      const transactionResult = await client.query(transactionQuery, [
        seedId,
        userId,
        quantity,
        newBalance,
        recipient,
        purpose,
        affiliation,
        contact,
        remarks,
      ]);

      const transaction = transactionResult.rows[0];

      await createOutboxEvent({
        eventType: KAFKA_EVENTS.SEED_WITHDRAWAL,
        topic: KAFKA_TOPICS.TRANSACTIONS,
        payload: {
          actor: userId,
          transaction_id: transaction.transaction_id,
          seed_id: seedId,
          quantity: checkOutQuantity,
          balance_after: newBalance,
          recipient,
          purpose,
          affiliation,
          contact,
          remarks,
        },
        sourceSystem: KAFKA_SOURCE_SYSTEM,
        client,
      });

      if (newBalance <= LOW_STOCK_THRESHOLD) {
        await createOutboxEvent({
          eventType: KAFKA_EVENTS.LOW_STOCK_ALERT,
          topic: KAFKA_TOPICS.ALERTS,
          payload: {
            actor: userId,
            seed_id: seedId,
            current_quantity: newBalance,
            threshold: LOW_STOCK_THRESHOLD,
            transaction_id: transaction.transaction_id,
          },
          sourceSystem: KAFKA_SOURCE_SYSTEM,
          client,
        });
      }

      await client.query("COMMIT");
      return transaction;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Note: Check-in transactions removed - use gross_weight for initial seed quantity

  // Create disposal transaction
  async dispose(seedId, userId, quantity, purpose, remarks) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const stockQuery = `SELECT current_quantity FROM seed_lot WHERE seed_id = $1 FOR UPDATE`;
      const stockResult = await client.query(stockQuery, [seedId]);

      if (!stockResult.rows[0]) {
        throw new Error("Seed lot not found");
      }

      const currentQuantity = parseFloat(stockResult.rows[0].current_quantity);
      const disposeQuantity = parseFloat(quantity);

      if (disposeQuantity > currentQuantity) {
        throw new Error("Cannot dispose more than available");
      }

      const newBalance = currentQuantity - disposeQuantity;

      await client.query(
        `UPDATE seed_lot SET current_quantity = $1 WHERE seed_id = $2`,
        [newBalance, seedId],
      );

      const transactionQuery = `
        INSERT INTO transaction (
          transaction_id, seed_id, user_id, transaction_type, quantity,
          balance_after, purpose, remarks, created_at
        )
        VALUES (gen_random_uuid(), $1, $2, 'disposal', $3, $4, $5, $6, NOW())
        RETURNING *
      `;
      const transactionResult = await client.query(transactionQuery, [
        seedId,
        userId,
        quantity,
        newBalance,
        purpose,
        remarks,
      ]);

      const transaction = transactionResult.rows[0];

      await createOutboxEvent({
        eventType: KAFKA_EVENTS.SEED_DISPOSAL,
        topic: KAFKA_TOPICS.TRANSACTIONS,
        payload: {
          actor: userId,
          transaction_id: transaction.transaction_id,
          seed_id: seedId,
          quantity: disposeQuantity,
          balance_after: newBalance,
          purpose,
          remarks,
        },
        sourceSystem: KAFKA_SOURCE_SYSTEM,
        client,
      });

      if (newBalance <= LOW_STOCK_THRESHOLD) {
        await createOutboxEvent({
          eventType: KAFKA_EVENTS.LOW_STOCK_ALERT,
          topic: KAFKA_TOPICS.ALERTS,
          payload: {
            actor: userId,
            seed_id: seedId,
            current_quantity: newBalance,
            threshold: LOW_STOCK_THRESHOLD,
            transaction_id: transaction.transaction_id,
          },
          sourceSystem: KAFKA_SOURCE_SYSTEM,
          client,
        });
      }

      await client.query("COMMIT");
      return transaction;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = TransactionModel;
