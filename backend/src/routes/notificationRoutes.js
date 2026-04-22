const express = require("express");
const router = express.Router();
const NotificationController = require("../controllers/notificationController");
const { authenticate } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// GET notifications for current user
router.get("/", NotificationController.getByUser);

// GET unread notification count
router.get("/unread-count", NotificationController.getUnreadCount);

// PUT mark notification as read
router.put("/:id/mark-read", NotificationController.markAsRead);

// PUT mark all notifications as read
router.put("/mark-all-read", NotificationController.markAllAsRead);

// DELETE notification
router.delete("/:id", NotificationController.delete);

module.exports = router;
