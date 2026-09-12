const mongoose = require("mongoose");
const { Schema } = mongoose;

const PullRequestSchema = new Schema(
  {
    prNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sourceBranch: {
      type: String,
      required: true,
      trim: true,
    },
    targetBranch: {
      type: String,
      required: true,
      default: "main",
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "closed", "merged"],
      default: "open",
    },
    comments: [
      {
        author: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    mergedAt: {
      type: Date,
    },
    mergedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    closedAt: {
      type: Date,
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

PullRequestSchema.index({ repository: 1, prNumber: 1 });
PullRequestSchema.index({ repository: 1, status: 1 });

const PullRequest = mongoose.model("PullRequest", PullRequestSchema);
module.exports = PullRequest;
