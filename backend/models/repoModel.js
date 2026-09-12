const mongoose = require("mongoose");
const { Schema } = mongoose;

const RepositorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    defaultBranch: {
      type: String,
      default: "main",
      trim: true,
    },
    branches: [
      {
        name: { type: String, required: true },
        headCommit: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    content: [
      {
        type: String,
      },
    ],
    files: [
      {
        path: { type: String, required: true },
        content: { type: String, default: "" },
        size: { type: Number, default: 0 },
        branch: { type: String, default: "main" },
        lastModified: { type: Date, default: Date.now },
        lastCommitMessage: { type: String, default: "Add file" },
      },
    ],
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issues: [
      {
        type: Schema.Types.ObjectId,
        ref: "Issue",
      },
    ],
    pullRequests: [
      {
        type: Schema.Types.ObjectId,
        ref: "PullRequest",
      },
    ],
    commits: [
      {
        commitID: {
          type: String,
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        branch: {
          type: String,
          default: "main",
        },
        files: [
          {
            type: String,
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

// Compound unique index: each user can have only one repo with a given name
RepositorySchema.index({ owner: 1, name: 1 }, { unique: true });

const Repository = mongoose.model("Repository", RepositorySchema);
module.exports = Repository;
