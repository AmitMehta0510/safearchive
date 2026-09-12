const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");
const User = require("../models/userModel");
const { sendNotification } = require("../utils/notifyHelper");

// ── Helper: parse pagination params ──────────────────────────────────────────
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ── Create Issue ──────────────────────────────────────────────────────────────
const createIssue = async (req, res) => {
  const { title, description, repository: bodyRepo } = req.body;
  const repoId = req.params.id || bodyRepo;
  const userId = req.user;

  try {
    if (!repoId || !mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({ error: "Valid repository ID is required." });
    }

    const repo = await Repository.findById(repoId);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found." });
    }

    const issue = new Issue({
      title: title.trim(),
      description: description ? description.trim() : "",
      repository: repoId,
      author: userId || null,
      status: "open",
    });

    const savedIssue = await issue.save();

    await Repository.findByIdAndUpdate(repoId, { $push: { issues: savedIssue._id } });

    const io = req.app.get("io");
    if (io) {
      io.to("repo_" + repoId).emit("activity", {
        type: "issue_created",
        title: savedIssue.title,
        repoId,
        timestamp: new Date().toISOString(),
      });

      // Send notification to repository owner
      if (repo.owner) {
        const senderUser = userId ? await User.findById(userId) : null;
        sendNotification(io, {
          recipient: repo.owner,
          sender: userId,
          type: "issue",
          title: "New Issue Created",
          message: `${senderUser ? senderUser.username : "A user"} opened issue: "${savedIssue.title}" on ${repo.name}`,
          link: `/repo/${repoId}`,
        });
      }
    }

    res.status(201).json(savedIssue);
  } catch (err) {
    console.error("Error during issue creation:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// ── Update Issue ──────────────────────────────────────────────────────────────
const updateIssueById = async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid issue ID" });
    }

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    if (title !== undefined) issue.title = title.trim();
    if (description !== undefined) issue.description = description.trim();
    if (status !== undefined) issue.status = status;

    await issue.save();

    const io = req.app.get("io");
    if (io) {
      io.to("repo_" + issue.repository).emit("activity", {
        type: "issue_updated",
        title: issue.title,
        status: issue.status,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(issue);
  } catch (err) {
    console.error("Error during issue update:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// ── Delete Issue ──────────────────────────────────────────────────────────────
const deleteIssueById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid issue ID" });
    }

    const issue = await Issue.findByIdAndDelete(id);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    await Repository.findByIdAndUpdate(issue.repository, { $pull: { issues: id } });

    res.json({ message: "Issue deleted successfully" });
  } catch (err) {
    console.error("Error during issue deletion:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// ── Get All Issues (paginated, filterable by repo) ────────────────────────────
const getAllIssues = async (req, res) => {
  const repoId = req.params.id || req.query.repository;
  const { status } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  try {
    const query = {};
    if (repoId && mongoose.Types.ObjectId.isValid(repoId)) query.repository = repoId;
    if (status && ["open", "closed"].includes(status)) query.status = status;

    const [issues, total] = await Promise.all([
      Issue.find(query)
        .populate("author", "username avatar")
        .populate("comments.author", "username avatar")
        .populate("reactions.users", "username")
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit),
      Issue.countDocuments(query),
    ]);

    res.json({
      issues,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Error during issue retrieval:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// ── Get Issue by ID ───────────────────────────────────────────────────────────
const getIssueById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid issue ID" });
    }

    const issue = await Issue.findById(id)
      .populate("repository", "name owner")
      .populate("author", "username avatar")
      .populate("comments.author", "username avatar")
      .populate("reactions.users", "username");

    if (!issue) return res.status(404).json({ error: "Issue not found" });
    res.json(issue);
  } catch (err) {
    console.error("Error during issue retrieval:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// ── Toggle Issue Reaction ─────────────────────────────────────────────────────
const toggleIssueReaction = async (req, res) => {
  const { id } = req.params;
  const { emoji, commentId } = req.body;
  const userId = req.user;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid issue ID" });
    }
    if (!emoji || !emoji.trim()) {
      return res.status(400).json({ error: "Emoji is required" });
    }

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    let targetReactions = issue.reactions;

    if (commentId) {
      const comment = (issue.comments || []).id(commentId);
      if (!comment) return res.status(404).json({ error: "Comment not found" });
      if (!comment.reactions) comment.reactions = [];
      targetReactions = comment.reactions;
    }

    const existingIdx = targetReactions.findIndex((r) => r.emoji === emoji);

    if (existingIdx >= 0) {
      const userIdx = targetReactions[existingIdx].users.findIndex(
        (u) => u.toString() === userId.toString()
      );
      if (userIdx >= 0) {
        // Toggle OFF
        targetReactions[existingIdx].users.splice(userIdx, 1);
        if (targetReactions[existingIdx].users.length === 0) {
          targetReactions.splice(existingIdx, 1);
        }
      } else {
        // Toggle ON
        targetReactions[existingIdx].users.push(userId);
      }
    } else {
      // New emoji reaction
      targetReactions.push({ emoji, users: [userId] });
    }

    await issue.save();

    const populated = await Issue.findById(id)
      .populate("reactions.users", "username")
      .populate("comments.reactions.users", "username");

    const io = req.app.get("io");
    if (io) {
      io.to("repo_" + issue.repository).emit("issue_reaction", {
        issueId: id,
        reactions: commentId ? populated.comments.id(commentId).reactions : populated.reactions,
      });
    }

    res.json({
      message: "Reaction toggled",
      reactions: commentId ? populated.comments.id(commentId).reactions : populated.reactions,
    });
  } catch (err) {
    console.error("Error toggling issue reaction:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// ── Add Issue Comment ─────────────────────────────────────────────────────────
const addIssueComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid issue ID" });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    const newComment = {
      author: userId,
      content: content.trim(),
      createdAt: new Date(),
      reactions: [],
    };

    if (!issue.comments) issue.comments = [];
    issue.comments.push(newComment);
    await issue.save();

    const populated = await Issue.findById(id).populate("comments.author", "username avatar");
    const addedComment = populated.comments[populated.comments.length - 1];

    const io = req.app.get("io");
    if (io) {
      io.to("repo_" + issue.repository).emit("issue_comment", {
        issueId: id,
        comment: addedComment,
      });

      if (issue.author) {
        const commenter = await User.findById(userId);
        sendNotification(io, {
          recipient: issue.author,
          sender: userId,
          type: "comment",
          title: "New Comment on Issue",
          message: `${commenter ? commenter.username : "A user"} commented on your issue: "${issue.title}"`,
          link: `/repo/${issue.repository}`,
        });
      }
    }

    res.status(201).json({ message: "Comment added", comment: addedComment });
  } catch (err) {
    console.error("Error adding issue comment:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  createIssue,
  updateIssueById,
  deleteIssueById,
  getAllIssues,
  getIssueById,
  toggleIssueReaction,
  addIssueComment,
};
