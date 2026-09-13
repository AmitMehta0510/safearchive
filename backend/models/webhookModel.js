const mongoose = require("mongoose");
const { Schema } = mongoose;

const WebhookSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      default: "",
      trim: true,
    },
    events: {
      type: [String],
      default: ["push", "issue_created", "pr_merged"],
    },
    contentType: {
      type: String,
      default: "application/json",
    },
    active: {
      type: Boolean,
      default: true,
    },
    deliveries: [
      {
        deliveryId: { type: String, required: true },
        event: { type: String, required: true },
        statusCode: { type: Number },
        durationMs: { type: Number },
        payload: { type: Schema.Types.Mixed },
        responseBody: { type: String },
        deliveredAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Webhook = mongoose.model("Webhook", WebhookSchema);
module.exports = Webhook;