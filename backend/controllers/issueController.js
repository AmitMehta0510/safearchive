const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");

const createIssue = async (req, res) => {
  const { title, description, repository: bodyRepo } = req.body;
  const repoId = req.params.id || bodyRepo;

  try {
    if (!title) {
      return res.status(400).json({ error: "Issue title is required." });
    }
    if (!repoId || !mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({ error: "Valid repository ID is required." });
    }

    const issue = new Issue({
      title,
      description: description || "",
      repository: repoId,
      status: "open",
    });

    const savedIssue = await issue.save();

    // Link issue ID to the repository document
    await Repository.findByIdAndUpdate(repoId, {
      $push: { issues: savedIssue._id },
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("activity", {
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

const updateIssueById = async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid issue ID" });
    }

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    if (title !== undefined) issue.title = title;
    if (description !== undefined) issue.description = description;
    if (status !== undefined) issue.status = status;

    await issue.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("activity", {
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

const deleteIssueById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid issue ID" });
    }

    const issue = await Issue.findByIdAndDelete(id);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    // Remove issue reference from repository
    await Repository.findByIdAndUpdate(issue.repository, {
      $pull: { issues: id },
    });

    res.json({ message: "Issue deleted successfully" });
  } catch (err) {
    console.error("Error during issue deletion:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

const getAllIssues = async (req, res) => {
  const repoId = req.params.id || req.query.repository;

  try {
    const query = repoId && mongoose.Types.ObjectId.isValid(repoId) ? { repository: repoId } : {};
    const issues = await Issue.find(query).sort({ _id: -1 });
    res.json(issues);
  } catch (err) {
    console.error("Error during issue retrieval:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

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
