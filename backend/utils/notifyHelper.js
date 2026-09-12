const Notification = require("../models/notificationModel");

/**
 * Creates and dispatches an in-app and real-time notification to a user.
 */
async function sendNotification(io, { recipient, sender, type, title, message = "", link = "" }) {
  if (!recipient) return null;
  // Don't notify user of their own action
  if (sender && recipient.toString() === sender.toString()) return null;

  try {
    const notification = new Notification({
      recipient,
      sender: sender || null,
      type,
      title,
      message,
      link,
      read: false,
    });

    await notification.save();

    if (io) {
      const populated = await Notification.findById(notification._id).populate(
        "sender",
        "username avatar"
      );
      // Emit to recipient user room
      io.to(recipient.toString()).emit("notification", populated);
    }

    return notification;
  } catch (err) {
    console.error("Error creating notification:", err.message);
    return null;
  }
}

module.exports = {
  sendNotification,
};
