const express = require("express");
const SeedController = require("../controllers/seedController");
const TransactionController = require("../controllers/transactionController");
const GerminationRecordController = require("../controllers/germinationRecordController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const multer = require("multer");
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

router.get("/", authenticate, SeedController.getAll);

router.get(
  "/export/excel",
  authenticate,
  authorize("admin", "staff", "researcher"),
  SeedController.exportExcel,
);

router.post(
  "/import/excel",
  authenticate,
  authorize("admin", "staff", "researcher"),
  upload.single("file"),
  SeedController.importExcel,
);

router.get(
  "/import/template",
  authenticate,
  authorize("admin", "staff", "researcher"),
  SeedController.downloadTemplate,
);

router.get("/:id", authenticate, SeedController.getById);
router.get(
  "/:id/transactions",
  authenticate,
  TransactionController.getBySeedId,
);
router.get("/:id/germination-records", authenticate, (req, res) => {
  req.params.seedId = req.params.id;
  return GerminationRecordController.getBySeedId(req, res);
});
router.post(
  "/",
  authenticate,
  authorize("admin", "staff", "researcher"),
  SeedController.create,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "staff", "researcher"),
  SeedController.update,
);
router.delete("/:id", authenticate, authorize("admin", "researcher"), SeedController.delete);

module.exports = router;
