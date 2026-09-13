const express = require("express");
const webhookController = require("../controllers/webhookController");
const authMiddleware = require("../middleware/authMiddleware");

const webhookRouter = express.Router();

webhookRouter.get("/repo/:id/webhooks", authMiddleware, webhookController.listWebhooks);
webhookRouter.post("/repo/:id/webhooks", authMiddleware, webhookController.createWebhook);
webhookRouter.delete("/repo/:id/webhooks/:webhookId", authMiddleware, webhookController.deleteWebhook);
webhookRouter.post("/repo/:id/webhooks/:webhookId/test", authMiddleware, webhookController.testWebhook);

module.exports = webhookRouter;