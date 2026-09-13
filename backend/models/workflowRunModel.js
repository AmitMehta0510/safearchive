const mongoose = require("mongoose");
const { Schema } = mongoose;

const WorkflowRunSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: "CI Build & Test Suite",
    },
    runNumber: {
      type: Number,
      default: 1,
    },
    commitID: {
      type: String,
      required: true,
      index: true,
    },
    commitMessage: {
      type: String,
      default: "",
    },
    branch: {
      type: String,
      default: "main",
      index: true,
    },
    event: {
      type: String,
      enum: ["push", "pull_request", "manual"],
      default: "push",
    },
    status: {
      type: String,
      enum: ["queued", "in_progress", "success", "failure"],
      default: "queued",
    },
    conclusion: {
      type: String,
      enum: ["success", "failure", "neutral", "cancelled", "pending"],
      default: "pending",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    triggerUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    steps: [
      {
        stepNumber: { type: Number, required: true },
        name: { type: String, required: true },
        status: {
          type: String,
          enum: ["queued", "in_progress", "completed", "failed"],
          default: "queued",
        },
        durationMs: { type: Number, default: 0 },
        logs: { type: [String], default: [] },
      },
    ],
  },
  { timestamps: true }
);

const WorkflowRun = mongoose.model("WorkflowRun", WorkflowRunSchema);
module.exports = WorkflowRun;