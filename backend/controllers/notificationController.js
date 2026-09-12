const Notification = require("../models/notificationModel");

const getNotifications = async (req, res) => {
  const userId = req.user;

  try {
    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "username avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (err) {
    console.error("Error retrieving notifications:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

const markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user;

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    res.json({ notification, unreadCount });
  } catch (err) {
    console.error("Error marking notification read:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

const markAllAsRead = async (req, res) => {
  const userId = req.user;

  try {
    await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "All notifications marked as read", unreadCount: 0 });
  } catch (err) {
    console.error("Error marking all read:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
