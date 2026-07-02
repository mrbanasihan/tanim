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
  authorize("admin", "staff", "researcher"),
  TransactionController.exportExcel,
);

router.post(
  "/import/excel",
  authenticate,
  authorize("admin", "staff", "researcher"),
  upload.single("file"),
  TransactionController.importExcel,
);

router.get(
  "/import/template",
  authenticate,
  authorize("admin", "staff", "researcher"),
  TransactionController.downloadTemplate,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin", "researcher", "staff", "guest"),
  TransactionController.getById,
);
router.post(
  "/check-out",
  authenticate,
  authorize("admin", "researcher", "staff"),
  TransactionController.checkOut
);
router.post(
  "/disposal",
  authenticate,
  authorize("admin", "researcher", "staff"),
  TransactionController.dispose
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "researcher", "staff"),
  TransactionController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "researcher"),
  TransactionController.delete,
);

module.exports = router;
