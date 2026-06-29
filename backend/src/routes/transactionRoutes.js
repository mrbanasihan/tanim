const express = require("express");
const TransactionController = require("../controllers/transactionController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", authenticate, TransactionController.getAll);
router.get("/recent", authenticate, TransactionController.getRecent);
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
