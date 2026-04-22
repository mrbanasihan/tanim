const GerminationRecordModel = require("../models/germinationRecordModel");

const GerminationRecordController = {
  // GET /api/germination-records
  async getAll(req, res) {
    try {
      const { seed_id } = req.query;
      const filters = seed_id ? { seed_id } : {};
      const records = await GerminationRecordModel.getAll(filters);
      res.json(records);
    } catch (error) {
      console.error("Get germination records error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/germination-records/seed/:seedId
  async getBySeedId(req, res) {
    try {
      const { seedId } = req.params;
      const records = await GerminationRecordModel.getBySeedId(seedId);
      res.json(records);
    } catch (error) {
      console.error("Get germination records by seed error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/germination-records/seed/:seedId/latest
  async getLatestBySeedId(req, res) {
    try {
      const { seedId } = req.params;
      const record = await GerminationRecordModel.getLatestBySeedId(seedId);
      if (!record) {
        return res.status(404).json({ error: "No germination records found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Get latest germination record error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/germination-records
  async create(req, res) {
    try {
      const { seed_id, germination_rate, next_germination_date } = req.body;

      if (!seed_id || germination_rate === undefined) {
        return res.status(400).json({
          error: "Seed ID and germination rate are required",
        });
      }

      if (germination_rate < 0 || germination_rate > 100) {
        return res.status(400).json({
          error: "Germination rate must be between 0 and 100",
        });
      }

      const record = await GerminationRecordModel.create(
        {
          seed_id,
          germination_rate: parseFloat(germination_rate),
          next_germination_date,
        },
        req.user.userId,
      );

      res.status(201).json(record);
    } catch (error) {
      console.error("Create germination record error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // DELETE /api/germination-records/:id
  async delete(req, res) {
    try {
      const { id } = req.params;
      const record = await GerminationRecordModel.delete(id);

      if (!record) {
        return res.status(404).json({ error: "Germination record not found" });
      }

      res.json({ message: "Germination record deleted successfully" });
    } catch (error) {
      console.error("Delete germination record error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = GerminationRecordController;
