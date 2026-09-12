const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");

// ── Helper: parse pagination params ──────────────────────────────────────────
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ── Create Repository ─────────────────────────────────────────────────────────
const createRepository = async (req, res) => {
  const { name, description, visibility = "public" } = req.body;
  const owner = req.user;

  try {
    const newRepository = new Repository({
      owner,
      name: name.trim(),
      description: description ? description.trim() : "",
      visibility,
    });

    const result = await newRepository.save();

    // Append repo to user doc
    await User.findByIdAndUpdate(owner, { $addToSet: { repositories: result._id } });

    // Broadcast socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("activity", {
        type: "repo_created",
        repoName: result.name,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      message: "Repository created successfully!",
      repositoryID: result._id,
      name: result.name,
      visibility: result.visibility,
      description: result.description,
    });
  } catch (err) {
    console.error("Error during repository creation:", err.message);
    if (err.code === 11000) {
      return res.status(400).json({ error: "You already have a repository with this name" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

// ── Get All Repositories (paginated) ─────────────────────────────────────────
const getAllRepositories = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  try {
    const [repositories, total] = await Promise.all([
      Repository.find({})
        .populate("owner", "username email")
        .populate("issues")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Repository.countDocuments({}),
    ]);

    res.json({
      repositories,
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
    console.error("Error during repository retrieval:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ── Search Repositories ───────────────────────────────────────────────────────
const searchRepositories = async (req, res) => {
  const { q = "", page, limit, skip } = { ...getPagination(req.query), q: req.query.q || "" };

  if (!q.trim()) {
    return res.status(400).json({ error: "Search query (q) is required" });
  }

  try {
    const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const filter = {
      visibility: "public",
      $or: [{ name: searchRegex }, { description: searchRegex }],
    };

    const [repositories, total] = await Promise.all([
      Repository.find(filter)
        .populate("owner", "username")
        .select("name description visibility owner createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Repository.countDocuments(filter),
    ]);

    res.json({
      query: q,
      repositories,
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
    console.error("Error during repository search:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ── Get Repository by ID ──────────────────────────────────────────────────────
const getRepositoryById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    const repository = await Repository.findById(id)
      .populate("owner", "username email")
      .populate("issues");

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    res.json(repository);
  } catch (err) {
    console.error("Error during repository retrieval:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ── Get Repository by Name ────────────────────────────────────────────────────
const fetchRepositoryByName = async (req, res) => {
  const { name } = req.params;

  try {
    const repository = await Repository.findOne({ name })
      .populate("owner", "username email")
      .populate("issues");

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    res.json(repository);
  } catch (err) {
    console.error("Error during repository retrieval:", err.message);
    res.status(500).send("Server error");
  }
};

// ── Get User Repositories (paginated) ────────────────────────────────────────
const fetchRepositoriesForCurrentUser = async (req, res) => {
  const userId = req.params.userID || req.user;
  const { page, limit, skip } = getPagination(req.query);

  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Valid User ID required" });
    }

    const [repositories, total] = await Promise.all([
      Repository.find({ owner: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Repository.countDocuments({ owner: userId }),
    ]);

    res.json({
      message: "Repositories found",
      repositories: repositories || [],
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
    console.error("Error during user repositories retrieval:", err.message);
    res.status(500).send("Server error");
  }
};

// ── Update Repository ─────────────────────────────────────────────────────────
const updateRepositoryById = async (req, res) => {
  const { id } = req.params;
  const { content, description } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    if (content) repository.content.push(content);
    if (description !== undefined) repository.description = description;

    const updatedRepository = await repository.save();
    res.json({ message: "Repository updated successfully", repository: updatedRepository });
  } catch (err) {
    console.error("Error during repository update:", err.message);
    res.status(500).send("Server error");
  }
};

// ── Toggle Visibility ─────────────────────────────────────────────────────────
const toggleVisibilityById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    repository.visibility = repository.visibility === "public" ? "private" : "public";
    const updatedRepository = await repository.save();

    res.json({
      message: "Repository visibility updated successfully!",
      repository: updatedRepository,
    });
  } catch (err) {
    console.error("Error during visibility toggle:", err.message);
    res.status(500).send("Server error");
  }
};

// ── Delete Repository ─────────────────────────────────────────────────────────
const deleteRepositoryById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const repository = await Repository.findByIdAndDelete(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Clean up orphaned issues
    if (repository.issues && repository.issues.length > 0) {
      await Issue.deleteMany({ _id: { $in: repository.issues } });
    }

    // Remove from owner's repositories list
    await User.findByIdAndUpdate(repository.owner, {
      $pull: { repositories: id },
    });

    res.json({ message: "Repository deleted successfully!" });
  } catch (err) {
    console.error("Error deleting repository:", err.message);
    res.status(500).send("Server error");
  }
};

// ── Get Repo Commits ──────────────────────────────────────────────────────────
const getRepoCommits = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    const repository = await Repository.findById(id).select("commits");
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }
    const commits = (repository.commits || []).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    res.json(commits);
  } catch (err) {
    console.error("Error retrieving commits:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ── Record Commit (called by CLI bridge or frontend) ─────────────────────────
const recordCommit = async (req, res) => {
  const { id } = req.params;
  const { commitID, message, files = [] } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Prevent duplicate commits (idempotent CLI sync)
    const alreadyRecorded = repository.commits.some((c) => c.commitID === commitID);
    if (alreadyRecorded) {
      return res.status(200).json({
        message: "Commit already recorded (idempotent)",
        commitID,
      });
    }

    const newCommit = { commitID, message, files, date: new Date() };
    repository.commits.push(newCommit);
    files.forEach((f) => {
      if (!repository.content.includes(f)) {
        repository.content.push(f);
      }
    });

    await repository.save();

    // Broadcast socket event
    const io = req.app.get("io");
    if (io) {
      io.to("repo_" + id).emit("activity", {
        type: "commit_pushed",
        repoName: repository.name,
        commitID: commitID.slice(0, 8),
        message,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({ message: "Commit recorded successfully", commit: newCommit });
  } catch (err) {
    console.error("Error recording commit:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createRepository,
  getAllRepositories,
  searchRepositories,
  getRepositoryById,
  fetchRepositoryByName,
  fetchRepositoriesForCurrentUser,
  updateRepositoryById,
  toggleVisibilityById,
  deleteRepositoryById,
  getRepoCommits,
  recordCommit,
};