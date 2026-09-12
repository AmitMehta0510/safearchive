const express = require("express");
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

const notificationRouter = express.Router();

notificationRouter.get("/notifications", authMiddleware, notificationController.getNotifications);
notificationRouter.patch("/notifications/read-all", authMiddleware, notificationController.markAllAsRead);
notificationRouter.patch("/notifications/:id/read", authMiddleware, notificationController.markAsRead);

module.exports = notificationRouter;
