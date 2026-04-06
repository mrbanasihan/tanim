const express = require("express");
const ProjectController = require("../controllers/projectController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", authenticate, ProjectController.getAll);
router.get("/:id", authenticate, ProjectController.getById);
router.post(
  "/",
  authenticate,
  authorize("admin", "researcher", "staff"),
  ProjectController.create,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "researcher", "staff"),
  ProjectController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "researcher"),
  ProjectController.delete,
);

module.exports = router;
