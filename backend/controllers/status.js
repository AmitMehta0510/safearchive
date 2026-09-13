const fs = require("fs").promises;
const path = require("path");
const { getCurrentBranch, getLatestCommitId } = require("./branch");

async function statusRepo() {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const stagingPath = path.join(repoPath, "staging");
  const commitsPath = path.join(repoPath, "commits");

  try {
    try {
      await fs.access(repoPath);
    } catch {
      console.error("fatal: not a SafeArchive repository (or any of the parent directories): .safearchive");
      return;
    }

    const currentBranch = await getCurrentBranch(repoPath);
    console.log(`On branch \x1b[36m${currentBranch}\x1b[0m`);

    // Latest commit
    const latestCommitId = await getLatestCommitId(repoPath);
    let committedFiles = {}; // map filename -> content or exists
    let latestCommitMeta = null;

    if (latestCommitId) {
      try {
        const commitDir = path.join(commitsPath, latestCommitId);
        const metaRaw = await fs.readFile(path.join(commitDir, "commit.json"), "utf8");
        latestCommitMeta = JSON.parse(metaRaw);
        console.log(`Latest revision: \x1b[33m${latestCommitId.slice(0, 8)}\x1b[0m "${latestCommitMeta.message || ''}"`);

        const cFiles = await fs.readdir(commitDir);
        for (const f of cFiles) {
          if (f === "commit.json") continue;
          committedFiles[f] = await fs.readFile(path.join(commitDir, f), "utf8");
        }
      } catch {
        console.log("No commits yet.");
      }
    } else {
      console.log("No commits yet.");
    }

    // Staged files
    let stagedFiles = [];
    const stagedContents = {};
    try {
      stagedFiles = await fs.readdir(stagingPath);
      for (const f of stagedFiles) {
        stagedContents[f] = await fs.readFile(path.join(stagingPath, f), "utf8");
      }
    } catch {}

    // Working directory scan
    const currentDirFiles = await fs.readdir(process.cwd());
    const ignored = [
      ".safearchive",
      ".git",
      "node_modules",
      ".env",
      "package-lock.json",
      "dist",
      "build",
    ];
    const workingFiles = [];
    const workingContents = {};

    for (const f of currentDirFiles) {
      if (ignored.includes(f)) continue;
      try {
        const stat = await fs.stat(path.resolve(process.cwd(), f));
        if (stat.isFile()) {
          workingFiles.push(f);
          workingContents[f] = await fs.readFile(path.resolve(process.cwd(), f), "utf8");
        }
      } catch {}
    }

    // 1. Changes to be committed (staged)
    if (stagedFiles.length > 0) {
      console.log("\n\x1b[32mChanges to be committed:\x1b[0m");
      console.log('  (use "safearchive commit <message>" to commit changes)');
      for (const file of stagedFiles) {
        const type = committedFiles[file] !== undefined ? "modified:  " : "new file:  ";
        console.log(`\t\x1b[32m${type} ${file}\x1b[0m`);
      }
    }

    // 2. Changes not staged for commit (modified or deleted tracked files)
    const unstagedModified = [];
    const unstagedDeleted = [];

    // Check tracked files (from latest commit) against working files and staged
    for (const file of Object.keys(committedFiles)) {
      if (!workingFiles.includes(file) && !stagedFiles.includes(file)) {
        unstagedDeleted.push(file);
      } else if (workingFiles.includes(file)) {
        // Compare working copy against staging (if staged) or latest commit
        const baseContent = stagedContents[file] !== undefined ? stagedContents[file] : committedFiles[file];
        if (workingContents[file] !== baseContent) {
          unstagedModified.push(file);
        }
      }
    }

    if (unstagedModified.length > 0 || unstagedDeleted.length > 0) {
      console.log("\n\x1b[31mChanges not staged for commit:\x1b[0m");
      console.log('  (use "safearchive add <file>..." to update what will be committed)');
      for (const file of unstagedModified) {
        console.log(`\t\x1b[31mmodified:   ${file}\x1b[0m`);
      }
      for (const file of unstagedDeleted) {
        console.log(`\t\x1b[31mdeleted:    ${file}\x1b[0m`);
      }
    }

    // 3. Untracked files
    const untracked = workingFiles.filter(
      (f) => !stagedFiles.includes(f) && committedFiles[f] === undefined
    );

    if (untracked.length > 0) {
      console.log("\n\x1b[31mUntracked files:\x1b[0m");
      console.log('  (use "safearchive add <file>..." to include in what will be committed)');
      for (const file of untracked) {
        console.log(`\t\x1b[31m${file}\x1b[0m`);
      }
    }

    if (
      stagedFiles.length === 0 &&
      unstagedModified.length === 0 &&
      unstagedDeleted.length === 0 &&
      untracked.length === 0
    ) {
      console.log("\nnothing to commit, working tree clean");
    }

    console.log("");
  } catch (err) {
    console.error("Error checking repository status:", err.message);
  }
}

module.exports = { statusRepo };