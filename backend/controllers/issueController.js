const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");

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

  try {
    if (!repoId || !mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({ error: "Valid repository ID is required." });
    }

    const issue = new Issue({
      title: title.trim(),
      description: description ? description.trim() : "",
      repository: repoId,
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

    const issue = await Issue.findById(id).populate("repository", "name owner");
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    res.json(issue);
  } catch (err) {
    console.error("Error during issue retrieval:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  createIssue,
  updateIssueById,
  deleteIssueById,
  getAllIssues,
  getIssueById,
};