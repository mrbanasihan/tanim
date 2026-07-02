const express = require("express");
const router = express.Router();
const GerminationRecordController = require("../controllers/germinationRecordController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(authenticate);

// GET all germination records or filter by seed_id
router.get("/", GerminationRecordController.getAll);

// GET germination records for a specific seed
router.get("/seed/:seedId", GerminationRecordController.getBySeedId);

// GET latest germination record for a specific seed
router.get(
  "/seed/:seedId/latest",
  GerminationRecordController.getLatestBySeedId,
);

// POST create new germination record
router.post(
  "/",
  authorize("admin", "researcher", "staff"),
  GerminationRecordController.create
);

// DELETE germination record
router.delete(
  "/:id",
  authorize("admin", "researcher"),
  GerminationRecordController.delete
);

module.exports = router;
