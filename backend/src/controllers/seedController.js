const SeedModel = require("../models/seedModel");
const {
  validateSeedLot,
  sanitizeString,
  sanitizeTitleCase,
  sanitizeQuantity,
} = require("../utils/validation");

const sanitizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

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
  // POST /api/seeds
  async create(req, res) {
    try {
      const seedData = {
        ...req.body,
        // batch_name is auto-generated - DO NOT include
        crop_type: sanitizeTitleCase(req.body.crop_type).toLowerCase(),
        variety: sanitizeTitleCase(req.body.variety),
        classification: sanitizeString(req.body.classification).toLowerCase(),
        moisture_content: sanitizeOptionalNumber(req.body.moisture_content),
        gross_weight: sanitizeQuantity(req.body.gross_weight),
        cleaned_quantity:
          req.body.cleaned_quantity !== undefined &&
          req.body.cleaned_quantity !== ""
            ? sanitizeOptionalNumber(req.body.cleaned_quantity)
            : null,
        area_planted: sanitizeTitleCase(req.body.area_planted),
        remarks: sanitizeString(req.body.remarks),
      };

      const validation = validateSeedLot(seedData, {
        requireGrossWeight: true,
      });
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      seedData.created_by = req.user.userId;

      const seed = await SeedModel.create(seedData, req.user.userId);

      res.status(201).json(seed);
    } catch (error) {
      console.error("Create seed error:", error);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Seed data:", seedData);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
        code: error.code,
      });
    }
  },

  // PUT /api/seeds/:id
  async update(req, res) {
    try {
      const { id } = req.params;
      const seedData = {
        ...req.body,
        batch_name: sanitizeTitleCase(req.body.batch_name),
        crop_type: sanitizeTitleCase(req.body.crop_type).toLowerCase(),
        variety: sanitizeTitleCase(req.body.variety),
        classification: sanitizeString(req.body.classification).toLowerCase(),
        moisture_content: sanitizeOptionalNumber(req.body.moisture_content),
        gross_weight: sanitizeQuantity(req.body.gross_weight),
        cleaned_quantity:
          req.body.cleaned_quantity !== undefined &&
          req.body.cleaned_quantity !== ""
            ? sanitizeOptionalNumber(req.body.cleaned_quantity)
            : null,
        area_planted: sanitizeTitleCase(req.body.area_planted),
        remarks: sanitizeString(req.body.remarks),
      };

      const validation = validateSeedLot(seedData, {
        requireGrossWeight: false,
      });
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

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
