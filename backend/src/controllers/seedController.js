const SeedModel = require("../models/seedModel");

const SeedController = {
  // GET /api/seeds
  async getAll(req, res) {
    try {
      const { crop_type, variety, project_id, search, limit, offset } =
        req.query;

      const seeds = await SeedModel.getAll({
        crop_type,
        variety,
        project_id,
        search,
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : null,
      });

      res.json(seeds);
    } catch (error) {
      console.error("Get seeds error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/seeds/:id
  async getById(req, res) {
    try {
      const { id } = req.params;
      const seed = await SeedModel.getById(id);

      if (!seed) {
        return res.status(404).json({ error: "Seed lot not found" });
      }

      res.json(seed);
    } catch (error) {
      console.error("Get seed error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/seeds
  async create(req, res) {
    try {
      const seedData = req.body;

      // Validation
      if (
        !seedData.crop_type ||
        !seedData.variety ||
        !seedData.classification ||
        !seedData.gross_weight
      ) {
        return res.status(400).json({
          error:
            "Crop type, variety, classification, and gross weight are required to create a seed lot",
        });
      }

      // Add user ID for backend tracking
      seedData.created_by = req.user.userId;

      const seed = await SeedModel.create(seedData, req.user.userId);

      res.status(201).json(seed);
    } catch (error) {
      console.error("Create seed error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // PUT /api/seeds/:id
  async update(req, res) {
    try {
      const { id } = req.params;
      const seedData = req.body;

      const seed = await SeedModel.update(id, seedData);

      if (!seed) {
        return res.status(404).json({ error: "Seed lot not found" });
      }

      res.json(seed);
    } catch (error) {
      console.error("Update seed error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // DELETE /api/seeds/:id
  async delete(req, res) {
    try {
      const { id } = req.params;
      const seed = await SeedModel.delete(id);

      if (!seed) {
        return res.status(404).json({ error: "Seed lot not found" });
      }

      res.json({ message: "Seed lot deleted successfully" });
    } catch (error) {
      console.error("Delete seed error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = SeedController;
