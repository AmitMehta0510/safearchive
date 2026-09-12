const { ZipArchive } = require("archiver");
const { s3, S3_BUCKET } = require("../config/aws-config");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
﻿const mongoose = require("mongoose");
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


// --- PHASE 1 HELPERS ---
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".json": "json",
    ".html": "html",
    ".css": "css",
    ".md": "markdown",
    ".py": "python",
    ".sh": "bash",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".sql": "sql",
    ".go": "go",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
  };
  return map[ext] || "plaintext";
}

async function fetchFromS3(key) {
  if (!S3_BUCKET) return null;
  try {
    const data = await s3.getObject({ Bucket: S3_BUCKET, Key: key }).promise();
    return data.Body ? data.Body.toString("utf-8") : null;
  } catch (err) {
    return null;
  }
}

function computeLineDiff(oldStr, newStr) {
  const oldLines = oldStr === "" ? [] : oldStr.split(/\r?\n/);
  const newLines = newStr === "" ? [] : newStr.split(/\r?\n/);
  const m = oldLines.length;
  const n = newLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diffLines = [];
  let i = m, j = n;
  let additions = 0, deletions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diffLines.unshift({ type: "common", text: oldLines[i - 1], oldLine: i, newLine: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffLines.unshift({ type: "added", text: newLines[j - 1], newLine: j });
      additions++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diffLines.unshift({ type: "deleted", text: oldLines[i - 1], oldLine: i });
      deletions++;
      i--;
    }
  }

  return { lines: diffLines, additions, deletions };
}

// 1. Get Repository Tree
const getRepoTree = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const filePaths = new Set();
    (repository.content || []).forEach((f) => filePaths.add(f));
    (repository.files || []).forEach((f) => filePaths.add(f.path));
    (repository.commits || []).forEach((c) => {
      (c.files || []).forEach((f) => filePaths.add(f));
    });

    const fileMap = new Map();
    (repository.files || []).forEach((f) => fileMap.set(f.path, f));

    const sortedCommits = [...(repository.commits || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const tree = Array.from(filePaths).sort().map((filePath) => {
      const dbFile = fileMap.get(filePath);
      const latestCommit = sortedCommits.find((c) => (c.files || []).includes(filePath));

      return {
        path: filePath,
        name: path.basename(filePath),
        size: dbFile ? dbFile.size : 0,
        lastCommitMessage: latestCommit ? latestCommit.message : (dbFile?.lastCommitMessage || "Initial commit"),
        lastModified: latestCommit ? latestCommit.date : (dbFile?.lastModified || repository.createdAt),
      };
    });

    res.json({
      tree,
      totalFiles: tree.length,
      defaultBranch: "main",
    });
  } catch (err) {
    console.error("Error retrieving repo tree:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// 2. Get File Content
const getFileContent = async (req, res) => {
  const { id } = req.params;
  const filePath = req.query.path;
  const commitID = req.query.commit;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    if (!filePath) {
      return res.status(400).json({ error: "File path parameter required (?path=...)" });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const dbFile = (repository.files || []).find((f) => f.path === filePath);
    let content = dbFile ? dbFile.content : null;

    if (commitID) {
      const s3Content = await fetchFromS3(`commits/${commitID}/${filePath}`);
      if (s3Content !== null) content = s3Content;
    } else if (content === null) {
      const relevantCommits = (repository.commits || [])
        .filter((c) => (c.files || []).includes(filePath))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      for (const c of relevantCommits) {
        const s3Content = await fetchFromS3(`commits/${c.commitID}/${filePath}`);
        if (s3Content !== null) {
          content = s3Content;
          break;
        }
      }
    }

    if (content === null) {
      if (filePath.toLowerCase().endsWith("readme.md")) {
        content = `# ${repository.name}\n\n${repository.description || "A SafeArchive cloud repository."}\n\n## Getting Started\n\n\`\`\`bash\nsafearchive pull\n\`\`\`\n`;
      } else {
        content = `// SafeArchive Vault: ${filePath}\n// Repository: ${repository.name}\n`;
      }
    }

    const size = Buffer.byteLength(content, "utf-8");
    const language = detectLanguage(filePath);

    res.json({
      path: filePath,
      content,
      size,
      language,
      lastModified: dbFile?.lastModified || repository.updatedAt,
      lastCommitMessage: dbFile?.lastCommitMessage || "Update " + filePath,
    });
  } catch (err) {
    console.error("Error retrieving file content:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// 3. Get Commit Diff
const getCommitDiff = async (req, res) => {
  const { id, commitId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const targetCommit = (repository.commits || []).find((c) => c.commitID === commitId);
    if (!targetCommit) {
      return res.status(404).json({ error: "Commit not found" });
    }

    const sortedCommits = [...(repository.commits || [])].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const targetIdx = sortedCommits.findIndex((c) => c.commitID === commitId);
    const prevCommits = targetIdx > 0 ? sortedCommits.slice(0, targetIdx).reverse() : [];

    const diffFiles = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const filePath of (targetCommit.files || [])) {
      let newContent = await fetchFromS3(`commits/${commitId}/${filePath}`);
      if (newContent === null) {
        const dbFile = (repository.files || []).find((f) => f.path === filePath);
        newContent = dbFile?.content || `// File: ${filePath}\n`;
      }

      let oldContent = "";
      const prevCommit = prevCommits.find((c) => (c.files || []).includes(filePath));
      if (prevCommit) {
        const s3Old = await fetchFromS3(`commits/${prevCommit.commitID}/${filePath}`);
        if (s3Old !== null) oldContent = s3Old;
      }

      const diff = computeLineDiff(oldContent, newContent);
      totalAdditions += diff.additions;
      totalDeletions += diff.deletions;

      diffFiles.push({
        path: filePath,
        status: oldContent === "" ? "added" : "modified",
        additions: diff.additions,
        deletions: diff.deletions,
        lines: diff.lines,
      });
    }

    res.json({
      commit: targetCommit,
      files: diffFiles,
      totalAdditions,
      totalDeletions,
    });
  } catch (err) {
    console.error("Error generating commit diff:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// 4. Download Repo ZIP
const downloadRepoZip = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const archive = new ZipArchive({ zlib: { level: 9 } });
    const zipName = `${repository.name}-main.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    archive.pipe(res);

    const filePaths = new Set();
    (repository.content || []).forEach((f) => filePaths.add(f));
    (repository.files || []).forEach((f) => filePaths.add(f.path));

    const fileMap = new Map();
    (repository.files || []).forEach((f) => fileMap.set(f.path, f.content));

    for (const filePath of filePaths) {
      let fileContent = fileMap.get(filePath);
      if (!fileContent) {
        const relevantCommits = (repository.commits || [])
          .filter((c) => (c.files || []).includes(filePath))
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        for (const c of relevantCommits) {
          const s3Content = await fetchFromS3(`commits/${c.commitID}/${filePath}`);
          if (s3Content !== null) {
            fileContent = s3Content;
            break;
          }
        }
      }

      if (!fileContent) {
        fileContent = filePath.toLowerCase().endsWith("readme.md")
          ? `# ${repository.name}\n\n${repository.description || ""}\n`
          : `// SafeArchive Vault: ${filePath}\n`;
      }

      archive.append(fileContent, { name: `${repository.name}/${filePath}` });
    }

    await archive.finalize();
  } catch (err) {
    console.error("Error creating repo zip:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to download zip archive" });
    }
  }
};

// 5. Create or Update File from Web
const createOrUpdateFile = async (req, res) => {
  const { id } = req.params;
  const { path: filePath, content = "", message } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    if (!filePath || !filePath.trim()) {
      return res.status(400).json({ error: "File path is required" });
    }

    const cleanPath = filePath.trim().replace(/^[\/\\]+/, "");
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const commitID = uuidv4().slice(0, 8);
    const commitMsg = message && message.trim() ? message.trim() : `Update ${cleanPath}`;

    const existingFileIndex = (repository.files || []).findIndex((f) => f.path === cleanPath);
    const fileData = {
      path: cleanPath,
      content,
      size: Buffer.byteLength(content, "utf-8"),
      lastModified: new Date(),
      lastCommitMessage: commitMsg,
    };

    if (existingFileIndex >= 0) {
      repository.files[existingFileIndex] = fileData;
    } else {
      repository.files.push(fileData);
    }

    if (!repository.content.includes(cleanPath)) {
      repository.content.push(cleanPath);
    }

    const newCommit = {
      commitID,
      message: commitMsg,
      files: [cleanPath],
      date: new Date(),
    };
    repository.commits.push(newCommit);

    await repository.save();

    if (S3_BUCKET) {
      try {
        await s3.upload({
          Bucket: S3_BUCKET,
          Key: `commits/${commitID}/${cleanPath}`,
          Body: content,
        }).promise();
      } catch (s3Err) {
        console.warn("S3 backup skipped:", s3Err.message);
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`repo_${id}`).emit("activity", {
        type: "commit_pushed",
        repoName: repository.name,
        commitID,
        message: commitMsg,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      message: "File committed successfully",
      commit: newCommit,
      file: fileData,
    });
  } catch (err) {
    console.error("Error creating/updating file:", err.message);
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
  getRepoTree,
  getFileContent,
  getCommitDiff,
  downloadRepoZip,
  createOrUpdateFile,
};