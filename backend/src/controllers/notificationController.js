const NotificationModel = require("../models/notificationModel");

const NotificationController = {
  // GET /api/notifications
  // Retrieve user notifications with optional read status filtering
  async getByUser(req, res) {
    try {
      const { isRead } = req.query;
      const filters =
        isRead !== undefined
          ? { isRead: isRead === "false" ? false : true }
          : {};
      const notifications = await NotificationModel.getByUserId(
        req.user.userId,
        filters,
      );
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/notifications/unread-count
  // Get count of unread notifications for authenticated user
  async getUnreadCount(req, res) {
    try {
      const count = await NotificationModel.getUnreadCount(req.user.userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // markAsRead
  // Mark single notification as read by ID
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notification = await NotificationModel.markAsRead(id);

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // PUT /api/notifications/mark-all-read
  // Mark all user notifications as read
  async markAllAsRead(req, res) {
    try {
      const notifications = await NotificationModel.markAllAsRead(
        req.user.userId,
      );
      res.json({ count: notifications.length });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // DELETE /api/notifications/:id
  // Remove notification by ID
  async delete(req, res) {
    try {
      const { id } = req.params;
      const notification = await NotificationModel.delete(id);

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = NotificationController;
