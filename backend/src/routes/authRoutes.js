const express = require("express");
const AuthController = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, AuthController.getCurrentUser);

module.exports = router;
