const db = require("../services/db");

const TransactionModel = {
  async getAll(filters = {}) {
    let query = `
      SELECT t.*, s.batch_name, u.first_name, u.last_name
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
    if (filters.start_date) {
      query += ` AND t.created_at >= $${paramIndex++}`;
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ` AND t.created_at <= $${paramIndex++}`;
      params.push(filters.end_date);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  },

  async getBySeedId(seedId) {
    const query = `
      SELECT t.*, u.first_name, u.last_name
      FROM transaction t
      JOIN "user" u ON t.user_id = u.user_id
      WHERE t.seed_id = $1
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(query, [seedId]);
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

      await client.query("COMMIT");
      return transactionResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Add seeds or Checkin
  async checkIn(seedId, userId, quantity, remarks) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const stockQuery = `SELECT current_quantity FROM seed_lot WHERE seed_id = $1 FOR UPDATE`;
      const stockResult = await client.query(stockQuery, [seedId]);

      if (!stockResult.rows[0]) {
        throw new Error("Seed lot not found");
      }

      const currentQuantity = parseFloat(stockResult.rows[0].current_quantity);
      const checkInQuantity = parseFloat(quantity);
      const newBalance = currentQuantity + checkInQuantity;

      await client.query(
        `UPDATE seed_lot SET current_quantity = $1 WHERE seed_id = $2`,
        [newBalance, seedId],
      );

      const transactionQuery = `
        INSERT INTO transaction (
          transaction_id, seed_id, user_id, transaction_type, quantity,
          balance_after, remarks, created_at
        )
        VALUES (gen_random_uuid(), $1, $2, 'incoming', $3, $4, $5, NOW())
        RETURNING *
      `;
      const transactionResult = await client.query(transactionQuery, [
        seedId,
        userId,
        quantity,
        newBalance,
        remarks,
      ]);

      await client.query("COMMIT");
      return transactionResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

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

      await client.query("COMMIT");
      return transactionResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Create adjustment transaction
  async adjust(seedId, userId, quantity, purpose, remarks) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const stockQuery = `SELECT current_quantity FROM seed_lot WHERE seed_id = $1 FOR UPDATE`;
      const stockResult = await client.query(stockQuery, [seedId]);

      if (!stockResult.rows[0]) {
        throw new Error("Seed lot not found");
      }

      const currentQuantity = parseFloat(stockResult.rows[0].current_quantity);
      const adjustQuantity = parseFloat(quantity);
      const newBalance = currentQuantity + adjustQuantity;

      if (newBalance < 0) {
        throw new Error("Adjustment would result in negative stock");
      }

      await client.query(
        `UPDATE seed_lot SET current_quantity = $1 WHERE seed_id = $2`,
        [newBalance, seedId],
      );

      const transactionQuery = `
        INSERT INTO transaction (
          transaction_id, seed_id, user_id, transaction_type, quantity,
          balance_after, purpose, remarks, created_at
        )
        VALUES (gen_random_uuid(), $1, $2, 'return', $3, $4, $5, $6, NOW())
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

      await client.query("COMMIT");
      return transactionResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = TransactionModel;
