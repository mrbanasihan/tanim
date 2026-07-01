const express = require("express");
const TransactionController = require("../controllers/transactionController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const multer = require("multer");
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

router.get("/", authenticate, TransactionController.getAll);
router.get("/recent", authenticate, TransactionController.getRecent);

router.get(
  "/export/excel",
  authenticate,
  authorize("admin", "staff"),
  TransactionController.exportExcel,
);

router.post(
  "/import/excel",
  authenticate,
  authorize("admin", "staff"),
  upload.single("file"),
  TransactionController.importExcel,
);

router.get(
  "/import/template",
  authenticate,
  authorize("admin", "staff"),
  TransactionController.downloadTemplate,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin", "researcher"),
  TransactionController.getById,
);
router.post("/check-out", authenticate, TransactionController.checkOut);
router.post("/disposal", authenticate, TransactionController.dispose);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "researcher"),
  TransactionController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "researcher"),
  TransactionController.delete,
);

module.exports = router;
