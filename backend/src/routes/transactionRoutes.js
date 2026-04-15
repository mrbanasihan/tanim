const express = require("express");
const TransactionController = require("../controllers/transactionController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, TransactionController.getAll);
router.post("/check-out", authenticate, TransactionController.checkOut);
router.post("/check-in", authenticate, TransactionController.checkIn);
router.post("/disposal", authenticate, TransactionController.dispose);
router.post("/adjustment", authenticate, TransactionController.adjust);

module.exports = router;
