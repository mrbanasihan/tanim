const TransactionModel = require("../models/transactionModel");
const {
  validateCheckOut,
  validateDisposal,
  sanitizeString,
  sanitizeTitleCase,
  sanitizeQuantity,
  sanitizeContactNumber,
} = require("../utils/validation");

const TransactionController = {
  // GET /api/transactions/:id
  async getById(req, res) {
    try {
      const { id } = req.params;
      const transaction = await TransactionModel.getById(id);

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      res.json(transaction);
    } catch (error) {
      console.error("Get transaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/transactions
  async getAll(req, res) {
    try {
      const { seed_id, transaction_type, start_date, end_date } = req.query;

      const transactions = await TransactionModel.getAll({
        seed_id,
        transaction_type,
        start_date,
        end_date,
        userRole: req.user?.role,
        userId: req.user?.userId,
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
      const transactions = await TransactionModel.getBySeedId(
        id,
        req.user?.role,
        req.user?.userId,
      );
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
      const payload = {
        seed_id,
        quantity: sanitizeQuantity(quantity),
        recipient: sanitizeTitleCase(recipient),
        purpose: sanitizeTitleCase(purpose),
        affiliation: sanitizeTitleCase(affiliation),
        contact: sanitizeContactNumber(contact),
        remarks: sanitizeString(remarks),
      };

      const validation = validateCheckOut(payload);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      const transaction = await TransactionModel.checkOut(
        payload.seed_id,
        req.user.userId,
        payload.quantity,
        payload.recipient,
        payload.purpose,
        payload.affiliation,
        payload.contact,
        payload.remarks,
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

  // Note: Check-in transactions removed - use gross_weight for initial seed quantity

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
      const payload = {
        seed_id,
        quantity: sanitizeQuantity(quantity),
        purpose: sanitizeTitleCase(purpose),
        remarks: sanitizeString(remarks),
      };

      const validation = validateDisposal(payload);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      const transaction = await TransactionModel.dispose(
        payload.seed_id,
        req.user.userId,
        payload.quantity,
        payload.purpose,
        payload.remarks,
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

  // PUT /api/transactions/:id
  async update(req, res) {
    try {
      const { id } = req.params;

      const payload = {
        recipient: sanitizeTitleCase(req.body.recipient),
        purpose: sanitizeTitleCase(req.body.purpose),
        affiliation: sanitizeTitleCase(req.body.affiliation),
        contact: sanitizeContactNumber(req.body.contact),
        remarks: sanitizeString(req.body.remarks),
      };

      const existing = await TransactionModel.getById(id);
      if (!existing) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (existing.transaction_type === "outgoing" && !payload.recipient) {
        return res.status(400).json({ error: "Recipient is required" });
      }

      if (existing.transaction_type === "disposal" && !payload.purpose) {
        return res.status(400).json({ error: "Purpose is required" });
      }

      const updated = await TransactionModel.update(id, payload);
      res.json(updated);
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // DELETE /api/transactions/:id
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await TransactionModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Delete transaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = TransactionController;
