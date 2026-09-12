const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const PullRequest = require("../models/pullRequestModel");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const { compareFileSets } = require("../utils/diffHelper");

// Helper: Get files for a specific branch
function getFilesForBranch(repo, branchName) {
  const target = branchName || repo.defaultBranch || "main";
  const files = (repo.files || []).filter((f) => (f.branch || "main") === target);
  
  // Fallback: If querying default branch and no files are tagged with it, take files with no branch
  if (files.length === 0 && target === (repo.defaultBranch || "main")) {
    return (repo.files || []).filter((f) => !f.branch || f.branch === target);
  }
  return files;
}

// 1. Create Pull Request
const createPullRequest = async (req, res) => {
  const { id } = req.params;
  const { title, description = "", sourceBranch, targetBranch = "main" } = req.body;
  const author = req.user;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Pull request title is required" });
    }
    if (!sourceBranch || !sourceBranch.trim()) {
      return res.status(400).json({ error: "Source branch is required" });
    }
    if (sourceBranch.trim() === (targetBranch || "main").trim()) {
      return res.status(400).json({ error: "Source and target branches must be different" });
    }

    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const cleanSource = sourceBranch.trim();
    const cleanTarget = (targetBranch || repo.defaultBranch || "main").trim();

    // Check for existing open PR for these branches
    const existingOpenPR = await PullRequest.findOne({
      repository: id,
      sourceBranch: cleanSource,
      targetBranch: cleanTarget,
      status: "open",
    });

    if (existingOpenPR) {
      return res.status(400).json({
        error: `An open pull request (#${existingOpenPR.prNumber}) already exists for ${cleanSource} into ${cleanTarget}`,
        existingPrId: existingOpenPR._id,
      });
    }

    // Auto-increment PR number per repo
    const prCount = await PullRequest.countDocuments({ repository: id });
    const prNumber = prCount + 1;

    const pullRequest = new PullRequest({
      prNumber,
      title: title.trim(),
      description: description.trim(),
      repository: id,
      author,
      sourceBranch: cleanSource,
      targetBranch: cleanTarget,
      status: "open",
    });

    await pullRequest.save();

    // Link to repo
    if (!repo.pullRequests) repo.pullRequests = [];
    repo.pullRequests.push(pullRequest._id);
    await repo.save();

    const populatedPR = await PullRequest.findById(pullRequest._id).populate(
      "author",
      "username email"
    );

    // Socket.IO notifications
    const io = req.app.get("io");
    if (io) {
      io.to("repo_" + id).emit("activity", {
        type: "pr_created",
        repoName: repo.name,
        prNumber,
        title: pullRequest.title,
        author: populatedPR.author?.username || "User",
        sourceBranch: cleanSource,
        targetBranch: cleanTarget,
        timestamp: new Date().toISOString(),
      });
      io.emit("activity", {
        type: "pr_created",
        repoName: repo.name,
        prNumber,
        title: pullRequest.title,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      message: "Pull request created successfully",
      pullRequest: populatedPR,
    });
  } catch (err) {
    console.error("Error creating pull request:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 2. Get Repository Pull Requests
const getRepoPullRequests = async (req, res) => {
  const { id } = req.params;
  const { status = "all" } = req.query;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const filter = { repository: id };
    if (status && status !== "all") {
      filter.status = status;
    }

    const pullRequests = await PullRequest.find(filter)
      .populate("author", "username email")
      .populate("mergedBy", "username")
      .populate("closedBy", "username")
      .sort({ createdAt: -1 });

    const totalCount = await PullRequest.countDocuments({ repository: id });
    const openCount = await PullRequest.countDocuments({ repository: id, status: "open" });
    const closedCount = await PullRequest.countDocuments({ repository: id, status: "closed" });
    const mergedCount = await PullRequest.countDocuments({ repository: id, status: "merged" });

    res.json({
      pullRequests,
      totalCount,
      openCount,
      closedCount,
      mergedCount,
    });
  } catch (err) {
    console.error("Error retrieving pull requests:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 3. Get Pull Request By ID or Number with Diff
const getPullRequestById = async (req, res) => {
  const { id, prId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    let query = { repository: id };
    if (mongoose.Types.ObjectId.isValid(prId)) {
      query._id = prId;
    } else {
      query.prNumber = parseInt(prId, 10);
    }

    const pullRequest = await PullRequest.findOne(query)
      .populate("author", "username email")
      .populate("comments.author", "username email")
      .populate("mergedBy", "username")
      .populate("closedBy", "username");

    if (!pullRequest) {
      return res.status(404).json({ error: "Pull request not found" });
    }

    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Compute visual diff between sourceBranch and targetBranch
    const sourceFiles = getFilesForBranch(repo, pullRequest.sourceBranch);
    const targetFiles = getFilesForBranch(repo, pullRequest.targetBranch);
    const diff = compareFileSets(sourceFiles, targetFiles);

    res.json({
      pullRequest,
      diff,
    });
  } catch (err) {
    console.error("Error retrieving pull request details:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 4. Compare Branches Before PR Creation
const compareBranches = async (req, res) => {
  const { id } = req.params;
  const { base = "main", head } = req.query;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    if (!head) {
      return res.status(400).json({ error: "Head (compare) branch is required" });
    }

    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const sourceFiles = getFilesForBranch(repo, head);
    const targetFiles = getFilesForBranch(repo, base);
    const diff = compareFileSets(sourceFiles, targetFiles);

    res.json({
      base,
      head,
      diff,
      canMerge: diff.totalFilesChanged > 0,
    });
  } catch (err) {
    console.error("Error comparing branches:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 5. Add Comment to Pull Request
const addPRComment = async (req, res) => {
  const { id, prId } = req.params;
  const { content } = req.body;
  const author = req.user;

  try {
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content cannot be empty" });
    }

    let query = { repository: id };
    if (mongoose.Types.ObjectId.isValid(prId)) {
      query._id = prId;
    } else {
      query.prNumber = parseInt(prId, 10);
    }

    const pullRequest = await PullRequest.findOne(query);
    if (!pullRequest) {
      return res.status(404).json({ error: "Pull request not found" });
    }

    const newComment = {
      author,
      content: content.trim(),
      createdAt: new Date(),
    };

    pullRequest.comments.push(newComment);
    await pullRequest.save();

    const populatedPR = await PullRequest.findById(pullRequest._id).populate(
      "comments.author",
      "username email"
    );

    const createdComment = populatedPR.comments[populatedPR.comments.length - 1];

    const io = req.app.get("io");
    if (io) {
      io.to("repo_" + id).emit("activity", {
        type: "pr_comment",
        prNumber: pullRequest.prNumber,
        author: createdComment.author?.username || "User",
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      message: "Comment added successfully",
      comment: createdComment,
      comments: populatedPR.comments,
    });
  } catch (err) {
    console.error("Error adding PR comment:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 6. Merge Pull Request
const mergePullRequest = async (req, res) => {
  const { id, prId } = req.params;
  const userId = req.user;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    let query = { repository: id };
    if (mongoose.Types.ObjectId.isValid(prId)) {
      query._id = prId;
    } else {
      query.prNumber = parseInt(prId, 10);
    }

    const pullRequest = await PullRequest.findOne(query);
    if (!pullRequest) {
      return res.status(404).json({ error: "Pull request not found" });
    }

    if (pullRequest.status === "merged") {
      return res.status(400).json({ error: "Pull request is already merged" });
    }
    if (pullRequest.status === "closed") {
      return res.status(400).json({ error: "Cannot merge a closed pull request" });
    }

    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Get source files and target branch
    const sourceFiles = getFilesForBranch(repo, pullRequest.sourceBranch);
    const targetBranch = pullRequest.targetBranch || repo.defaultBranch || "main";

    // Merge source files into target branch in repo.files
    for (const sFile of sourceFiles) {
      const existingTargetIdx = (repo.files || []).findIndex(
        (f) => f.path === sFile.path && (f.branch || "main") === targetBranch
      );

      const mergedFileData = {
        path: sFile.path,
        content: sFile.content,
        size: sFile.size,
        branch: targetBranch,
        lastModified: new Date(),
        lastCommitMessage: `Merge PR #${pullRequest.prNumber} from ${pullRequest.sourceBranch}`,
      };

      if (existingTargetIdx >= 0) {
        repo.files[existingTargetIdx] = mergedFileData;
      } else {
        repo.files.push(mergedFileData);
      }

      // Also ensure repo.content tracks the file path
      if (!repo.content.includes(sFile.path)) {
        repo.content.push(sFile.path);
      }
    }

    // Create merge commit on target branch
    const commitID = uuidv4().substring(0, 8);
    const commitMsg = `Merge pull request #${pullRequest.prNumber} from ${pullRequest.sourceBranch} into ${targetBranch}`;

    const mergeCommit = {
      commitID,
      message: commitMsg,
      branch: targetBranch,
      files: sourceFiles.map((f) => f.path),
      date: new Date(),
    };

    repo.commits.push(mergeCommit);
    await repo.save();

    // Update PR doc
    pullRequest.status = "merged";
    pullRequest.mergedAt = new Date();
    pullRequest.mergedBy = userId;
    await pullRequest.save();

    const populatedPR = await PullRequest.findById(pullRequest._id)
      .populate("author", "username email")
      .populate("mergedBy", "username");

    // Socket.IO event
    const io = req.app.get("io");
    if (io) {
      io.to("repo_" + id).emit("activity", {
        type: "pr_merged",
        repoName: repo.name,
        prNumber: pullRequest.prNumber,
        title: pullRequest.title,
        sourceBranch: pullRequest.sourceBranch,
        targetBranch,
        mergedBy: populatedPR.mergedBy?.username || "User",
        commitID,
        timestamp: new Date().toISOString(),
      });
      io.emit("activity", {
        type: "pr_merged",
        repoName: repo.name,
        prNumber: pullRequest.prNumber,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      message: "Pull request merged successfully",
      pullRequest: populatedPR,
      commit: mergeCommit,
    });
  } catch (err) {
    console.error("Error merging pull request:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 7. Toggle PR Status (Close / Reopen)
const togglePRStatus = async (req, res) => {
  const { id, prId } = req.params;
  const { status } = req.body; // "open" or "closed"
  const userId = req.user;

  try {
    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'open' or 'closed'" });
    }

    let query = { repository: id };
    if (mongoose.Types.ObjectId.isValid(prId)) {
      query._id = prId;
    } else {
      query.prNumber = parseInt(prId, 10);
    }

    const pullRequest = await PullRequest.findOne(query);
    if (!pullRequest) {
      return res.status(404).json({ error: "Pull request not found" });
    }

    if (pullRequest.status === "merged") {
      return res.status(400).json({ error: "Merged pull requests cannot be modified" });
    }

    if (status === "closed") {
      pullRequest.status = "closed";
      pullRequest.closedAt = new Date();
      pullRequest.closedBy = userId;
    } else {
      pullRequest.status = "open";
      pullRequest.closedAt = null;
      pullRequest.closedBy = null;
    }

    await pullRequest.save();

    const populatedPR = await PullRequest.findById(pullRequest._id)
      .populate("author", "username email")
      .populate("closedBy", "username");

    const io = req.app.get("io");
    if (io) {
      io.to("repo_" + id).emit("activity", {
        type: "pr_status_changed",
        prNumber: pullRequest.prNumber,
        status,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      message: `Pull request ${status === "open" ? "reopened" : "closed"} successfully`,
      pullRequest: populatedPR,
    });
  } catch (err) {
    console.error("Error toggling PR status:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createPullRequest,
  getRepoPullRequests,
  getPullRequestById,
  compareBranches,
  addPRComment,
  mergePullRequest,
  togglePRStatus,
};
