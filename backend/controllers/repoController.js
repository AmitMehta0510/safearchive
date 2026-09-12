const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");

const createRepository = async (req, res) => {
  const { name, issues, content, description, visibility = "public" } = req.body;
  const owner = req.user || req.body.owner;

  try {
    if (!name) {
      return res.status(400).json({ error: "Repository name is required" });
    }
    if (!owner || !mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({ error: "A valid owner ID is required" });
    }

    if (!["public", "private"].includes(visibility)) {
      return res.status(400).json({ error: "Invalid visibility value. Must be 'public' or 'private'" });
    }

    const newRepository = new Repository({
      owner,
      name,
      issues: issues || [],
      content: content || [],
      description: description || "",
      visibility,
    });

    const result = await newRepository.save();

    // Broadcast socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("activity", {
        type: "repo_created",
        repoName: result.name,
        timestamp: new Date().toISOString(),
      });
    }

    // Optionally append repo to user's repositories array if User model exists
    try {
      await User.findByIdAndUpdate(owner, { $addToSet: { repositories: result._id } });
    } catch (e) {
      // Non-critical if user record uses native mongo collection
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
      return res.status(400).json({ error: "Repository with this name already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

const getAllRepositories = async (req, res) => {
  try {
    const repositories = await Repository.find({})
      .populate("owner", "username email")
      .populate("issues");
    res.json(repositories);
  } catch (err) {
    console.error("Error during repository retrieval:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

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

const fetchRepositoriesForCurrentUser = async (req, res) => {
  const userId = req.params.userID || req.user;

  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Valid User ID required" });
    }

    const repositories = await Repository.find({ owner: userId });
    res.json({ message: "Repositories found", repositories: repositories || [] });
  } catch (err) {
    console.error("Error during user repositories retrieval:", err.message);
    res.status(500).send("Server error");
  }
};

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
    res.json({
      message: "Repository updated successfully",
      repository: updatedRepository,
    });
  } catch (err) {
    console.error("Error during repository update:", err.message);
    res.status(500).send("Server error");
  }
};

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
    res.json({ message: "Repository deleted successfully!" });
  } catch (err) {
    console.error("Error deleting repository:", err.message);
    res.status(500).send("Server error");
  }
};

const getRepoCommits = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }
    const commits = repository.commits || [];
    commits.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(commits);
  } catch (err) {
    console.error("Error retrieving commits:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

const recordCommit = async (req, res) => {
  const { id } = req.params;
  const { commitID, message, files = [] } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    if (!commitID || !message) {
      return res.status(400).json({ error: "Commit ID and message are required" });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const newCommit = {
      commitID,
      message,
      files,
      date: new Date(),
    };

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
      io.emit("activity", {
        type: "commit_pushed",
        repoName: repository.name,
        commitID: commitID.slice(0, 8),
        message,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      message: "Commit recorded successfully",
      commit: newCommit,
    });
  } catch (err) {
    console.error("Error recording commit:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createRepository,
  getAllRepositories,
  getRepositoryById,
  fetchRepositoryByName,
  fetchRepositoriesForCurrentUser,
  updateRepositoryById,
  toggleVisibilityById,
  deleteRepositoryById,
  getRepoCommits,
  recordCommit,
};
