const express = require("express");
const SeedController = require("../controllers/seedController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", authenticate, SeedController.getAll);
router.get("/:id", authenticate, SeedController.getById);
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
