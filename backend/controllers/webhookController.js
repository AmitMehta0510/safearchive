const Webhook = require("../models/webhookModel");
const Repository = require("../models/repoModel");
const { deliverPayload } = require("../utils/webhookHelper");

const listWebhooks = async (req, res) => {
  const { id } = req.params;
  try {
    const webhooks = await Webhook.find({ repository: id }).sort({ createdAt: -1 });
    res.json(webhooks);
  } catch (err) {
    console.error("Error listing webhooks:", err);
    res.status(500).json({ error: "Failed to list webhooks" });
  }
};

const createWebhook = async (req, res) => {
  const { id } = req.params;
  const { url, secret, events, active = true } = req.body;
  const userId = req.user;

  if (!url || !url.trim()) {
    return res.status(400).json({ error: "Payload URL is required" });
  }

  try {
    new URL(url); // Validate URL format
  } catch {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  try {
    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const assignedEvents = Array.isArray(events) && events.length > 0
      ? events
      : ["push", "issue_created", "pr_merged"];

    const webhook = new Webhook({
      repository: id,
      url: url.trim(),
      secret: (secret || "").trim(),
      events: assignedEvents,
      active: Boolean(active),
      createdBy: userId,
    });

    await webhook.save();
    res.status(201).json(webhook);
  } catch (err) {
    console.error("Error creating webhook:", err);
    res.status(500).json({ error: "Failed to create webhook" });
  }
};

const deleteWebhook = async (req, res) => {
  const { id, webhookId } = req.params;

  try {
    const deleted = await Webhook.findOneAndDelete({ _id: webhookId, repository: id });
    if (!deleted) {
      return res.status(404).json({ error: "Webhook not found" });
    }
    res.json({ message: "Webhook deleted successfully" });
  } catch (err) {
    console.error("Error deleting webhook:", err);
    res.status(500).json({ error: "Failed to delete webhook" });
  }
};

const testWebhook = async (req, res) => {
  const { id, webhookId } = req.params;

  try {
    const webhook = await Webhook.findOne({ _id: webhookId, repository: id });
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const pingPayload = {
      event: "ping",
      zen: "SafeArchive: Distributed code vault and automation engine.",
      hook_id: webhook._id.toString(),
      hook: {
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
      },
      repository: {
        id,
      },
      sender: {
        id: req.user,
      },
      timestamp: new Date().toISOString(),
    };

    const deliveryRecord = await deliverPayload(webhook, "ping", pingPayload);

    // Save in delivery history
    webhook.deliveries = [deliveryRecord, ...(webhook.deliveries || [])].slice(0, 20);
    await webhook.save();

    res.json({
      message: "Ping payload delivered",
      delivery: deliveryRecord,
    });
  } catch (err) {
    console.error("Error testing webhook:", err);
    res.status(500).json({ error: "Failed to deliver ping payload" });
  }
};

module.exports = {
  listWebhooks,
  createWebhook,
  deleteWebhook,
  testWebhook,
};