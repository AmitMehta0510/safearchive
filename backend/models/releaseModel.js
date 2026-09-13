const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReleaseSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    tagName: {
      type: String,
      required: true,
      trim: true,
    },
    targetBranch: {
      type: String,
      default: "main",
    },
    targetCommit: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      default: "",
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    isPrerelease: {
      type: Boolean,
      default: false,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    assets: [
      {
        name: { type: String, required: true },
        size: { type: Number, default: 0 },
        downloadCount: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

const Release = mongoose.model("Release", ReleaseSchema);
module.exports = Release;