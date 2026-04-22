const express = require("express");
const SeedController = require("../controllers/seedController");
const TransactionController = require("../controllers/transactionController");
const GerminationRecordController = require("../controllers/germinationRecordController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", authenticate, SeedController.getAll);
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
  authorize("admin", "staff"),
  SeedController.create,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "staff"),
  SeedController.update,
);
router.delete("/:id", authenticate, authorize("admin"), SeedController.delete);

module.exports = router;
