import React, { useState, useEffect } from "react";
import api from "../services/api";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data);
      setTableExists(true);
    } catch (error) {
      if (error.response?.status === 500) {
        setTableExists(false);
      }
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/mark-read`);
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      fetchNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      fetchNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Group notifications by month
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const date = new Date(notification.created_at);
    const monthKey = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(notification);
    return acc;
  }, {});

  // Sort months in descending order
  const sortedMonths = Object.keys(groupedNotifications).sort((a, b) => {
    const dateA = new Date(groupedNotifications[a][0].created_at);
    const dateB = new Date(groupedNotifications[b][0].created_at);
    return dateB - dateA;
  });

  if (loading) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200 text-center">
            <p className="text-gray-500">
              Notifications system initializing...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 mb-2">
                All Notifications
              </h1>
              <p className="text-sm text-slate-500">
                View all your notifications grouped by month
              </p>
            </div>
            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={handleMarkAllAsRead}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedMonths.map((month) => (
                <div key={month}>
                  <h2 className="text-lg font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                    {month}
                  </h2>
                  <div className="space-y-3">
                    {groupedNotifications[month].map((notification) => (
                      <div
                        key={notification.notification_id}
                        className={`p-4 rounded-xl border transition-all ${
                          !notification.is_read
                            ? "bg-blue-50 border-blue-200"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">
                                {notification.message}
                              </p>
                              {!notification.is_read && (
                                <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(
                                notification.created_at,
                              ).toLocaleDateString()}{" "}
                              at{" "}
                              {new Date(
                                notification.created_at,
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!notification.is_read && (
                              <button
                                onClick={() =>
                                  handleMarkAsRead(notification.notification_id)
                                }
                                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-100 rounded transition"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleDelete(notification.notification_id)
                              }
                              className="text-xs px-2 py-1 text-red-600 hover:text-red-800 font-medium hover:bg-red-100 rounded transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
