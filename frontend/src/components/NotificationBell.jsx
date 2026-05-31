import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

// NotificationBell
// Bell icon showing unread notifications count with dropdown menu; interacts with notifications API
const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showDropdown]);

  // fetchNotifications
  // Fetches notifications and unread count from API
  const fetchNotifications = async () => {
    try {
      const [notificationsRes, countRes] = await Promise.all([
        api.get("/notifications"),
        api.get("/notifications/unread-count"),
      ]);
      setNotifications(notificationsRes.data);
      setUnreadCount(countRes.data.count);
      setTableExists(true);
    } catch (error) {
      // Table doesn't exist yet - graceful fallback
      if (error.response?.status === 500) {
        setTableExists(false);
      }
      console.error("Error fetching notifications:", error);
    }
  };

  // handleMarkAsRead
  // Marks a single notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/mark-read`);
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // handleMarkAllAsRead
  // Marks all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      fetchNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // handleDelete
  // Deletes a notification
  const handleDelete = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      fetchNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative text-green-200 hover:text-white transition-colors duration-200 p-2"
        title="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {!tableExists ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Notifications system initializing...
            </div>
          ) : notifications.filter((n) => !n.is_read).length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500 text-sm">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications
                .filter((n) => !n.is_read)
                .slice(0, 5)
                .map((notification) => (
                  <div
                    key={notification.notification_id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors bg-blue-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 font-medium">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(
                            notification.created_at,
                          ).toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(
                            notification.created_at,
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() =>
                            handleMarkAsRead(notification.notification_id)
                          }
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Mark as read"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(notification.notification_id)
                          }
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
            <button
              onClick={() => {
                navigate("/notifications");
                setShowDropdown(false);
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-1"
            >
              View All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
