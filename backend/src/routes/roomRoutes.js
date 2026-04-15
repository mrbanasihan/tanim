const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");

// Routes for rooms
router.get("/", roomController.getAll);
router.get("/:id", roomController.getById);
router.post("/", roomController.create);
router.put("/:id", roomController.update);
router.delete("/:id", roomController.remove);

module.exports = router;
