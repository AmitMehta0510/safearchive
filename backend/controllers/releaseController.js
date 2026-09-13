const { ZipArchive } = require("archiver");
const Release = require("../models/releaseModel");
const Repository = require("../models/repoModel");
const { triggerWebhooks } = require("../utils/webhookHelper");

const listReleases = async (req, res) => {
  const { id } = req.params;

  try {
    const releases = await Release.find({ repository: id })
      .populate("author", "username avatar")
      .sort({ publishedAt: -1 });

    res.json(releases);
  } catch (err) {
    console.error("Error listing releases:", err);
    res.status(500).json({ error: "Failed to list releases" });
  }
};

const getReleaseById = async (req, res) => {
  const { id, releaseId } = req.params;

  try {
    const release = await Release.findOne({ _id: releaseId, repository: id })
      .populate("author", "username avatar");

    if (!release) {
      return res.status(404).json({ error: "Release not found" });
    }

    res.json(release);
  } catch (err) {
    console.error("Error getting release:", err);
    res.status(500).json({ error: "Failed to get release" });
  }
};

const createRelease = async (req, res) => {
  const { id } = req.params;
  const { tagName, targetBranch = "main", name, body = "", isDraft = false, isPrerelease = false } = req.body;
  const userId = req.user;

  if (!tagName || !tagName.trim()) {
    return res.status(400).json({ error: "Tag name is required (e.g. v1.0.0)" });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Release title is required" });
  }

  try {
    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Check duplicate tag in this repo
    const existing = await Release.findOne({ repository: id, tagName: tagName.trim() });
    if (existing) {
      return res.status(400).json({ error: `Release tag '${tagName.trim()}' already exists` });
    }

    const branchMeta = (repo.branches || []).find((b) => b.name === targetBranch);
    const targetCommit = branchMeta?.headCommit || (repo.commits && repo.commits.length > 0 ? repo.commits[repo.commits.length - 1].commitID : "");

    const release = new Release({
      repository: id,
      tagName: tagName.trim(),
      targetBranch,
      targetCommit,
      name: name.trim(),
      body,
      isDraft: Boolean(isDraft),
      isPrerelease: Boolean(isPrerelease),
      author: userId,
      publishedAt: new Date(),
      assets: [
        {
          name: `${repo.name}-${tagName.trim()}.zip`,
          size: 0,
          downloadCount: 0,
        },
      ],
    });

    await release.save();

    // Trigger webhook if not draft
    if (!isDraft) {
      triggerWebhooks(id, "release_published", {
        action: "published",
        release: {
          id: release._id,
          tag_name: release.tagName,
          name: release.name,
          body: release.body,
          prerelease: release.isPrerelease,
          published_at: release.publishedAt,
        },
      }).catch((err) => console.error("Webhook trigger error:", err.message));
    }

    res.status(201).json(release);
  } catch (err) {
    console.error("Error creating release:", err);
    res.status(500).json({ error: "Failed to create release" });
  }
};

const updateRelease = async (req, res) => {
  const { id, releaseId } = req.params;
  const { name, body, isDraft, isPrerelease } = req.body;

  try {
    const release = await Release.findOne({ _id: releaseId, repository: id });
    if (!release) {
      return res.status(404).json({ error: "Release not found" });
    }

    if (name !== undefined) release.name = name.trim();
    if (body !== undefined) release.body = body;
    if (isDraft !== undefined) release.isDraft = Boolean(isDraft);
    if (isPrerelease !== undefined) release.isPrerelease = Boolean(isPrerelease);

    await release.save();
    res.json(release);
  } catch (err) {
    console.error("Error updating release:", err);
    res.status(500).json({ error: "Failed to update release" });
  }
};

const deleteRelease = async (req, res) => {
  const { id, releaseId } = req.params;

  try {
    const deleted = await Release.findOneAndDelete({ _id: releaseId, repository: id });
    if (!deleted) {
      return res.status(404).json({ error: "Release not found" });
    }
    res.json({ message: "Release deleted successfully" });
  } catch (err) {
    console.error("Error deleting release:", err);
    res.status(500).json({ error: "Failed to delete release" });
  }
};

const downloadReleaseArchive = async (req, res) => {
  const { id, releaseId } = req.params;

  try {
    const release = await Release.findOne({ _id: releaseId, repository: id });
    if (!release) {
      return res.status(404).json({ error: "Release not found" });
    }

    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Filter files on target branch
    const branchFiles = (repo.files || []).filter(
      (f) => !f.branch || f.branch === release.targetBranch
    );

    const archiveFilename = `${repo.name}-${release.tagName}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${archiveFilename}"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archive streaming error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Archive error" });
    });

    archive.pipe(res);

    // Append files to zip
    for (const file of branchFiles) {
      const relPath = file.path.replace(/^\//, "");
      archive.append(file.content || "", { name: relPath });
    }

    // Append README if not present
    if (!branchFiles.some((f) => f.path.toLowerCase().includes("readme"))) {
      archive.append(`# ${repo.name}\n\nRelease ${release.tagName}\n\n${release.body}\n`, {
        name: "README.md",
      });
    }

    await archive.finalize();

    // Increment asset download count
    if (release.assets && release.assets.length > 0) {
      release.assets[0].downloadCount = (release.assets[0].downloadCount || 0) + 1;
      release.save().catch(() => {});
    }
  } catch (err) {
    console.error("Error streaming release archive:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to download archive" });
  }
};

module.exports = {
  listReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  deleteRelease,
  downloadReleaseArchive,
};