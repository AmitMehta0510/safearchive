const fs = require("fs").promises;
const path = require("path");
const { computeLineDiff } = require("../utils/diffHelper");
const { getLatestCommitId } = require("./branch");

/**
 * Format a line-by-line diff with ANSI terminal colors
 */
function printColoredDiff(filePath, oldContent, newContent) {
  const result = computeLineDiff(oldContent, newContent);
  if (result.additions === 0 && result.deletions === 0) {
    return false;
  }

  console.log(`\x1b[1mdiff --safearchive a/${filePath} b/${filePath}\x1b[0m`);
  console.log(`\x1b[90m--- a/${filePath}\x1b[0m`);
  console.log(`\x1b[90m+++ b/${filePath}\x1b[0m`);

  // Print hunks
  console.log(`\x1b[36m@@ -1,${oldContent.split(/\r?\n/).length} +1,${newContent.split(/\r?\n/).length} @@\x1b[0m`);

  for (const line of result.lines) {
    if (line.type === "added") {
      console.log(`\x1b[32m+${line.text}\x1b[0m`);
    } else if (line.type === "deleted") {
      console.log(`\x1b[31m-${line.text}\x1b[0m`);
    } else {
      console.log(` ${line.text}`);
    }
  }
  console.log("");
  return true;
}

async function diffRepo(targetFile, options = {}) {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const stagingPath = path.join(repoPath, "staging");
  const commitsPath = path.join(repoPath, "commits");

  try {
    await fs.access(repoPath);
  } catch {
    console.error("fatal: not a SafeArchive repository (or any of the parent directories): .safearchive");
    return;
  }

  const isStaged = Boolean(options.staged || options.cached);
  const latestCommitId = await getLatestCommitId(repoPath);

  // Read latest commit files
  const committedFiles = {};
  if (latestCommitId) {
    try {
      const commitDir = path.join(commitsPath, latestCommitId);
      const cFiles = await fs.readdir(commitDir);
      for (const f of cFiles) {
        if (f === "commit.json") continue;
        committedFiles[f] = await fs.readFile(path.join(commitDir, f), "utf8");
      }
    } catch {}
  }

  // Read staged files
  const stagedFiles = {};
  try {
    const sFiles = await fs.readdir(stagingPath);
    for (const f of sFiles) {
      stagedFiles[f] = await fs.readFile(path.join(stagingPath, f), "utf8");
    }
  } catch {}

  let hasDiff = false;

  if (isStaged) {
    // Diffing staged files against latest commit
    const filesToDiff = targetFile
      ? [targetFile].filter((f) => stagedFiles[f] !== undefined)
      : Object.keys(stagedFiles);

    if (filesToDiff.length === 0) {
      console.log("No staged changes to diff.");
      return;
    }

    for (const file of filesToDiff) {
      const oldContent = committedFiles[file] || "";
      const newContent = stagedFiles[file] || "";
      const printed = printColoredDiff(file, oldContent, newContent);
      if (printed) hasDiff = true;
    }
  } else {
    // Diffing working directory against staging (or latest commit)
    const currentDirFiles = await fs.readdir(process.cwd());
    const ignored = [".safearchive", ".git", "node_modules", ".env", "package-lock.json", "dist", "build"];
    const workingFiles = targetFile
      ? [targetFile]
      : currentDirFiles.filter((f) => !ignored.includes(f));

    for (const file of workingFiles) {
      const filePath = path.resolve(process.cwd(), file);
      let workingContent = null;
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          workingContent = await fs.readFile(filePath, "utf8");
        }
      } catch {
        continue;
      }

      if (workingContent === null) continue;

      // Base content: staged if exists, else committed
      const baseContent = stagedFiles[file] !== undefined
        ? stagedFiles[file]
        : committedFiles[file];

      // If file was tracked or staged and modified
      if (baseContent !== undefined && baseContent !== workingContent) {
        const printed = printColoredDiff(file, baseContent, workingContent);
        if (printed) hasDiff = true;
      }
    }
  }

  if (!hasDiff) {
    console.log("No changes detected.");
  }
}

module.exports = { diffRepo };