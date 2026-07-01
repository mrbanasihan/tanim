const SeedModel = require("../models/seedModel");
const db = require("../services/db");
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
  // Retrieve all seed lots with optional filtering by crop type, variety, project, and search
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
      res.status(500).json({
        error: "Internal server error",
        message: error.message || "Unknown",
        detail: error.detail || null,
      });
    }
  },

  // GET /api/seeds/:id
  // Fetch single seed lot with project and storage area details
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
      res.status(500).json({
        error: "Internal server error",
        message: error.message || "Unknown",
        detail: error.detail || null,
      });
    }
  },

  // POST /api/seeds
  // Create new seed lot with auto-generated batch name and initial quantity setup
  async create(req, res) {
    try {
      const { ALL_CROP_TYPES, ALL_VARIETIES } = require("../constants/cropCatalog");
      let cropType = req.body.crop_type;
      let variety = req.body.variety;

      const matchedCrop = ALL_CROP_TYPES.find(c => c.toLowerCase() === (cropType || "").toLowerCase().trim());
      if (matchedCrop) {
        cropType = matchedCrop;
      }

      const matchedVariety = ALL_VARIETIES.find(v => v.toLowerCase() === (variety || "").toLowerCase().trim());
      if (matchedVariety) {
        variety = matchedVariety;
      }

      const seedData = {
        ...req.body,
        crop_type: cropType,
        variety: variety,
        classification: req.body.classification,
        moisture_content: sanitizeOptionalNumber(req.body.moisture_content),
        gross_weight: sanitizeQuantity(req.body.gross_weight),
        cleaned_quantity:
          req.body.cleaned_quantity !== undefined &&
          req.body.cleaned_quantity !== ""
            ? sanitizeOptionalNumber(req.body.cleaned_quantity)
            : null,
        area_planted: sanitizeTitleCase(req.body.area_planted),
        storage_area: req.body.storage_area || null,
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
      console.error("Error detail:", error.detail);
      res.status(500).json({
        error: "Internal server error",
        message: error.message || "Unknown error",
        code: error.code || "UNKNOWN",
        detail: error.detail || "",
      });
    }
  },

  // PUT /api/seeds/:id
  // Update seed lot details including crop type, variety, weight, and storage information
  async update(req, res) {
    try {
      const { id } = req.params;
      const { ALL_CROP_TYPES, ALL_VARIETIES } = require("../constants/cropCatalog");
      let cropType = req.body.crop_type;
      let variety = req.body.variety;

      const matchedCrop = ALL_CROP_TYPES.find(c => c.toLowerCase() === (cropType || "").toLowerCase().trim());
      if (matchedCrop) {
        cropType = matchedCrop;
      }

      const matchedVariety = ALL_VARIETIES.find(v => v.toLowerCase() === (variety || "").toLowerCase().trim());
      if (matchedVariety) {
        variety = matchedVariety;
      }

      const seedData = {
        ...req.body,
        batch_name: sanitizeTitleCase(req.body.batch_name),
        crop_type: cropType,
        variety: variety,
        classification: req.body.classification,
        moisture_content: sanitizeOptionalNumber(req.body.moisture_content),
        gross_weight: sanitizeQuantity(req.body.gross_weight),
        cleaned_quantity:
          req.body.cleaned_quantity !== undefined &&
          req.body.cleaned_quantity !== ""
            ? sanitizeOptionalNumber(req.body.cleaned_quantity)
            : null,
        area_planted: sanitizeTitleCase(req.body.area_planted),
        storage_area: req.body.storage_area || null,
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
  // Soft delete seed lot by marking is_active as false
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

  // GET /api/seeds/export/excel
  // Export all seed lots with applied filters as Excel file
  async exportExcel(req, res) {
    try {
      const { crop_type, variety, project_id, search } = req.query;

      const seeds = await SeedModel.getAll({
        crop_type,
        variety,
        project_id,
        search,
      });

      const XLSX = require("xlsx");
      const data = seeds.map(seed => ({
        "Batch Name": seed.batch_name,
        "Family Group": seed.family_group || "",
        "Crop Type": seed.crop_type,
        "Variety": seed.variety,
        "Classification": seed.classification,
        "Project": seed.project_name || "",
        "Moisture Content (%)": seed.moisture_content,
        "Gross Weight (kg)": seed.gross_weight,
        "Cleaned Weight (kg)": seed.cleaned_quantity,
        "Current Quantity (kg)": seed.current_quantity,
        "Latest Germination Rate (%)": seed.latest_germination_rate ? parseFloat(seed.latest_germination_rate) : null,
        "Area Planted": seed.area_planted,
        "Storage Area": seed.storage_area,
        "Remarks": seed.remarks,
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Seed Inventory");

      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=seed_inventory_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Export seed error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/seeds/import/excel
  // Import seed lots from Excel file
  async importExcel(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const XLSX = require("xlsx");

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const seedsToInsert = [];
      const validationErrors = [];

      const { ALL_CROP_TYPES, ALL_VARIETIES } = require("../constants/cropCatalog");

      rows.forEach((row, index) => {
        const rowNumber = index + 2; 
        
        let cropType = row["Crop Type"] ? String(row["Crop Type"]).toLowerCase().trim() : "";
        let variety = row["Variety"] ? String(row["Variety"]).trim() : "";
        
        const matchedCrop = ALL_CROP_TYPES.find(c => c.toLowerCase() === cropType.toLowerCase());
        if (matchedCrop) {
          cropType = matchedCrop;
        }

        const matchedVariety = ALL_VARIETIES.find(v => v.toLowerCase() === variety.toLowerCase());
        if (matchedVariety) {
          variety = matchedVariety;
        }

        const seedData = {
          project_name: row["Project"] ? String(row["Project"]).trim() : "",
          crop_type: cropType,
          variety: variety,
          classification: row["Classification"] ? String(row["Classification"]).toLowerCase().trim() : "",
          moisture_content: sanitizeOptionalNumber(row["Moisture Content (%)"]),
          gross_weight: sanitizeQuantity(row["Gross Weight (kg)"]),
          cleaned_quantity: sanitizeOptionalNumber(row["Cleaned Weight (kg)"]),
          area_planted: sanitizeTitleCase(row["Area Planted"]),
          storage_area: row["Storage Area"] ? String(row["Storage Area"]).trim() : null,
          remarks: sanitizeString(row["Remarks"]),
          created_by: req.user.userId,
        };

         const validation = validateSeedLot(seedData, { requireGrossWeight: true });
        if (!validation.isValid) {
          validationErrors.push(`Row ${rowNumber}: ${validation.errors.join(", ")}`);
        } else {
          seedsToInsert.push(seedData);
        }
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Import rejected due to validation errors",
          details: validationErrors,
        });
      }
      const insertedSeeds = [];
      for (const seedData of seedsToInsert) {
        if (seedData.project_name) {
          const projectResult = await db.query(
            "SELECT project_id FROM project WHERE project_name = $1 LIMIT 1",
            [seedData.project_name]
          );
          seedData.project_id = projectResult.rows[0] ? projectResult.rows[0].project_id : null;
        } else {
          seedData.project_id = null;
        }
        const newSeed = await SeedModel.create(seedData);
        insertedSeeds.push(newSeed);
      }
      res.json({
        message: `Successfully imported ${insertedSeeds.length} seed lots.`,
        importedCount: insertedSeeds.length,
      });
      
    } catch (error) {
      console.error("Import seed error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/seeds/import/template
  // Download Excel template for importing seeds
  async downloadTemplate(req, res) {
    try {
      const XLSX = require("xlsx");

      const headers = [
        "Crop Type",
        "Variety",
        "Classification",
        "Project",
        "Moisture Content (%)",
        "Gross Weight (kg)",
        "Cleaned Weight (kg)",
        "Current Quantity (kg)",
        "Area Planted",
        "Storage Area",
        "Remarks"
      ];

      const sampleRow = [
        "soybean",
        "Tiwala 6",
        "certified",
        "Sample Project A",
        12.5,
        100.0,
        95.5,
        95.5,
        "Field Alpha",
        "Cold Storage 1",
        "Sample remarks text"
      ];

      const aoaData = [headers, sampleRow];
      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Seed Import Template");

      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=seed_import_template.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Download template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

module.exports = SeedController;
