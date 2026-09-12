import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../config/api";

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  const currentUserId = localStorage.getItem("userId");

  // Fetch initial notifications
  const fetchNotifications = async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.warn("Could not load notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUserId]);

  // Socket.IO real-time notification listener
  useEffect(() => {
    if (!currentUserId) return;
    const socket = io("http://localhost:3000");

    socket.on("connect", () => {
      socket.emit("joinRoom", currentUserId);
    });

    socket.on("notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications read:", err);
    }
  };

  const handleClickItem = async (item) => {
    if (!item.read) {
      try {
        await api.patch(`/notifications/${item._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "star":
        return <span style={{ color: "#e3b341" }}>★</span>;
      case "issue":
        return <span style={{ color: "#3fb950" }}>●</span>;
      case "pr":
        return <span style={{ color: "#8957e5" }}>⑂</span>;
      case "comment":
        return <span style={{ color: "#58a6ff" }}>💬</span>;
      case "collaborator":
        return <span style={{ color: "#f0883e" }}>👥</span>;
      case "follow":
        return <span style={{ color: "#58a6ff" }}>👤</span>;
      default:
        return <span style={{ color: "#8b949e" }}>🔔</span>;
    }
  };

  const formatRelativeTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);

    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  if (!currentUserId) return null;

  return (
    <div className="notification-center-wrapper" ref={popoverRef}>
      <button
        type="button"
        className="btn-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <svg height="16" viewBox="0 0 16 16" width="16" fill="currentColor">
          <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.494 2.24A1.25 1.25 0 0 1 13.5 12.25H2.5a1.25 1.25 0 0 1-1.036-1.924l1.494-2.24a.25.25 0 0 0 .042-.139V5Z"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-popover">
          <div className="notification-popover-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 600, color: "#f0f6fc", fontSize: "0.88rem" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="notification-header-pill">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn-mark-all-read"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-items-scroll">
            {loading && notifications.length === 0 ? (
              <div className="notification-empty">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#8b949e" }}>
                  All caught up! No notifications.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  className={`notification-item ${!item.read ? "unread" : ""}`}
                  onClick={() => handleClickItem(item)}
                >
                  <div className="notification-icon-box">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="notification-content-box">
                    <div className="notification-title-text">{item.title}</div>
                    <div className="notification-message-text">{item.message}</div>
                    <div className="notification-time-text">
                      {formatRelativeTime(item.createdAt)}
                    </div>
                  </div>
                  {!item.read && <div className="notification-unread-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
