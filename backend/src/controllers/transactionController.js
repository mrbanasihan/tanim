const TransactionModel = require("../models/transactionModel");

const TransactionController = {
  // GET /api/transactions
  async getAll(req, res) {
    try {
      const { seed_id, transaction_type, start_date, end_date } = req.query;

      const transactions = await TransactionModel.getAll({
        seed_id,
        transaction_type,
        start_date,
        end_date,
      });

      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/seeds/:id/transactions
  async getBySeedId(req, res) {
    try {
      const { id } = req.params;
      const transactions = await TransactionModel.getBySeedId(id);
      res.json(transactions);
    } catch (error) {
      console.error("Get seed transactions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/transactions/check-out
  async checkOut(req, res) {
    try {
      const {
        seed_id: seedIdFromBody,
        seed_lot_id: seedLotIdFromBody,
        quantity,
        recipient,
        purpose,
        affiliation,
        contact,
        remarks,
      } = req.body;
      const seed_id = seedIdFromBody || seedLotIdFromBody;

      if (!seed_id || !quantity || !recipient) {
        return res
          .status(400)
          .json({ error: "Seed ID, quantity, and recipient are required" });
      }

      if (quantity <= 0) {
        return res
          .status(400)
          .json({ error: "Quantity must be greater than 0" });
      }

      const transaction = await TransactionModel.checkOut(
        seed_id,
        req.user.userId,
        quantity,
        recipient,
        purpose,
        affiliation,
        contact,
        remarks,
      );

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Checkout error:", error);
      if (error.message === "Insufficient stock") {
        return res.status(400).json({ error: "Insufficient stock available" });
      }
      if (error.message === "Seed lot not found") {
        return res.status(404).json({ error: "Seed lot not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/transactions/check-in
  async checkIn(req, res) {
    try {
      const {
        seed_id: seedIdFromBody,
        seed_lot_id: seedLotIdFromBody,
        quantity,
        remarks,
      } = req.body;
      const seed_id = seedIdFromBody || seedLotIdFromBody;

      if (!seed_id || !quantity) {
        return res
          .status(400)
          .json({ error: "Seed ID and quantity are required" });
      }

      if (quantity <= 0) {
        return res
          .status(400)
          .json({ error: "Quantity must be greater than 0" });
      }

      const transaction = await TransactionModel.checkIn(
        seed_id,
        req.user.userId,
        quantity,
        remarks,
      );

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Check-in error:", error);
      if (error.message === "Seed lot not found") {
        return res.status(404).json({ error: "Seed lot not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/transactions/disposal
  async dispose(req, res) {
    try {
      const {
        seed_id: seedIdFromBody,
        seed_lot_id: seedLotIdFromBody,
        quantity,
        purpose,
        remarks,
      } = req.body;
      const seed_id = seedIdFromBody || seedLotIdFromBody;

      if (!seed_id || !quantity || !purpose) {
        return res
          .status(400)
          .json({ error: "Seed ID, quantity, and purpose are required" });
      }

      if (quantity <= 0) {
        return res
          .status(400)
          .json({ error: "Quantity must be greater than 0" });
      }

      const transaction = await TransactionModel.dispose(
        seed_id,
        req.user.userId,
        quantity,
        purpose,
        remarks,
      );

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Disposal error:", error);
      if (error.message === "Cannot dispose more than available") {
        return res
          .status(400)
          .json({ error: "Cannot dispose more than available stock" });
      }
      if (error.message === "Seed lot not found") {
        return res.status(404).json({ error: "Seed lot not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/transactions/adjustment
  async adjust(req, res) {
    try {
      const {
        seed_id: seedIdFromBody,
        seed_lot_id: seedLotIdFromBody,
        quantity,
        purpose,
        remarks,
      } = req.body;
      const seed_id = seedIdFromBody || seedLotIdFromBody;

      if (!seed_id || !quantity || !purpose) {
        return res
          .status(400)
          .json({ error: "Seed ID, quantity, and purpose are required" });
      }

      const transaction = await TransactionModel.adjust(
        seed_id,
        req.user.userId,
        quantity,
        purpose,
        remarks,
      );

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Adjustment error:", error);
      if (error.message === "Adjustment would result in negative stock") {
        return res
          .status(400)
          .json({ error: "Adjustment would result in negative stock" });
      }
      if (error.message === "Seed lot not found") {
        return res.status(404).json({ error: "Seed lot not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = TransactionController;
