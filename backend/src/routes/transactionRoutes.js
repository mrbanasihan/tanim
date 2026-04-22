const express = require("express");
const TransactionController = require("../controllers/transactionController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, TransactionController.getAll);
router.post("/check-out", authenticate, TransactionController.checkOut);
router.post("/disposal", authenticate, TransactionController.dispose);

module.exports = router;
