const http = require("http");
const https = require("https");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const Webhook = require("../models/webhookModel");

/**
 * Deliver HTTP POST payload to a single webhook endpoint
 */
function deliverPayload(webhook, event, payload) {
  return new Promise((resolve) => {
    const deliveryId = uuidv4();
    const startTime = Date.now();
    const payloadStr = JSON.stringify(payload);

    let signatureHeader = "";
    if (webhook.secret) {
      const hmac = crypto.createHmac("sha256", webhook.secret).update(payloadStr).digest("hex");
      signatureHeader = `sha256=${hmac}`;
    }

    try {
      const targetUrl = new URL(webhook.url);
      const lib = targetUrl.protocol === "https:" ? https : http;

      const reqOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
        path: targetUrl.pathname + (targetUrl.search || ""),
        method: "POST",
        timeout: 6000,
        headers: {
          "Content-Type": webhook.contentType || "application/json",
          "Content-Length": Buffer.byteLength(payloadStr),
          "User-Agent": "SafeArchive-Hookshot/1.0",
          "X-SafeArchive-Event": event,
          "X-SafeArchive-Delivery": deliveryId,
          ...(signatureHeader ? { "X-SafeArchive-Signature-256": signatureHeader } : {}),
        },
      };

      const req = lib.request(reqOptions, (res) => {
        let respData = "";
        res.on("data", (chunk) => (respData += chunk));
        res.on("end", () => {
          const durationMs = Date.now() - startTime;
          resolve({
            deliveryId,
            event,
            statusCode: res.statusCode || 200,
            durationMs,
            payload,
            responseBody: respData.slice(0, 1000),
            deliveredAt: new Date(),
          });
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          deliveryId,
          event,
          statusCode: 408,
          durationMs: Date.now() - startTime,
          payload,
          responseBody: "Request Timeout (6000ms)",
          deliveredAt: new Date(),
        });
      });

      req.on("error", (err) => {
        resolve({
          deliveryId,
          event,
          statusCode: 500,
          durationMs: Date.now() - startTime,
          payload,
          responseBody: err.message,
          deliveredAt: new Date(),
        });
      });

      req.write(payloadStr);
      req.end();
    } catch (err) {
      resolve({
        deliveryId,
        event,
        statusCode: 400,
        durationMs: Date.now() - startTime,
        payload,
        responseBody: "Invalid URL: " + err.message,
        deliveredAt: new Date(),
      });
    }
  });
}

/**
 * Trigger all active webhooks for a given repository and event
 */
async function triggerWebhooks(repoId, event, payload) {
  try {
    const webhooks = await Webhook.find({
      repository: repoId,
      active: true,
      $or: [{ events: event }, { events: "*" }],
    });

    if (!webhooks || webhooks.length === 0) {
      return [];
    }

    const enrichedPayload = {
      event,
      timestamp: new Date().toISOString(),
      repository: {
        id: repoId.toString(),
      },
      ...payload,
    };

    const deliveryPromises = webhooks.map(async (wh) => {
      const deliveryRecord = await deliverPayload(wh, event, enrichedPayload);

      // Store in webhook delivery history (keep last 20)
      wh.deliveries = [deliveryRecord, ...(wh.deliveries || [])].slice(0, 20);
      try {
        await wh.save();
      } catch (saveErr) {
        console.error("Error saving webhook delivery record:", saveErr.message);
      }
      return deliveryRecord;
    });

    return await Promise.all(deliveryPromises);
  } catch (err) {
    console.error("Error triggering webhooks for repo", repoId, err.message);
    return [];
  }
}

module.exports = {
  triggerWebhooks,
  deliverPayload,
};