const db = require("../services/db");

const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 2);

const TransactionModel = {
  // getById
  // Retrieve single transaction with seed and user details
  async getById(transactionId) {
    const query = `
      SELECT t.*, s.batch_name, s.crop_type, s.variety
      FROM transaction t
      JOIN seed_lot s ON t.seed_id = s.seed_id
      WHERE t.transaction_id = $1
      LIMIT 1
    `;
    const result = await db.query(query, [transactionId]);
    return result.rows[0];
  },

  // getAll
  // Fetch all transactions with optional filtering and role-based access control
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

      const transaction = transactionResult.rows[0];

      // Log low stock alert if needed
      if (newBalance <= LOW_STOCK_THRESHOLD) {
        console.log(
          `Low stock alert for seed ${seedId}: ${newBalance}kg remaining`,
        );
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

      // Log disposal and low stock alerts as needed
      if (newBalance <= LOW_STOCK_THRESHOLD) {
        console.log(
          `Low stock alert for seed ${seedId}: ${newBalance}kg remaining after disposal`,
        );
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

  async update(transactionId, data) {
    const query = `
      UPDATE transaction
      SET recipient = $1,
          purpose = $2,
          affiliation = $3,
          contact = $4,
          remarks = $5
      WHERE transaction_id = $6
      RETURNING *
    `;

    const result = await db.query(query, [
      data.recipient || null,
      data.purpose || null,
      data.affiliation || null,
      data.contact || null,
      data.remarks || null,
      transactionId,
    ]);

    return result.rows[0];
  },

  async delete(transactionId) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const txQuery = `
        SELECT transaction_id, seed_id, transaction_type, quantity
        FROM transaction
        WHERE transaction_id = $1
        FOR UPDATE
      `;
      const txResult = await client.query(txQuery, [transactionId]);
      const transaction = txResult.rows[0];

      if (!transaction) {
        await client.query("ROLLBACK");
        return null;
      }

      const seedQuery = `
        SELECT current_quantity
        FROM seed_lot
        WHERE seed_id = $1
        FOR UPDATE
      `;
      const seedResult = await client.query(seedQuery, [transaction.seed_id]);

      if (!seedResult.rows[0]) {
        throw new Error("Seed lot not found");
      }

      const currentQuantity = parseFloat(seedResult.rows[0].current_quantity);
      const restoredQuantity =
        currentQuantity + parseFloat(transaction.quantity);

      await client.query(
        `UPDATE seed_lot SET current_quantity = $1 WHERE seed_id = $2`,
        [restoredQuantity, transaction.seed_id],
      );

      await client.query(`DELETE FROM transaction WHERE transaction_id = $1`, [
        transactionId,
      ]);

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
