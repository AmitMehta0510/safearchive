const fs = require("fs").promises;
const path = require("path");

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

    console.log("On branch \x1b[36mmain\x1b[0m");

    // Check latest commit
    try {
      const commitDirs = await fs.readdir(commitsPath);
      if (commitDirs.length > 0) {
        console.log(`Latest revision: \x1b[33m${commitDirs[commitDirs.length - 1].slice(0, 8)}\x1b[0m`);
      } else {
        console.log("No commits yet.");
      }
    } catch {
      console.log("No commits yet.");
    }

    // Check staging area
    let stagedFiles = [];
    try {
      stagedFiles = await fs.readdir(stagingPath);
    } catch {}

    if (stagedFiles.length > 0) {
      console.log("\n\x1b[32mChanges to be committed:\x1b[0m");
      console.log('  (use "safearchive commit <message>" to commit changes)');
      for (const file of stagedFiles) {
        console.log(`\t\x1b[32mnew file:   ${file}\x1b[0m`);
      }
    } else {
      console.log("\nNo changes staged for commit.");
    }

    // Scan untracked working files (excluding .safearchive, node_modules, etc.)
    const currentDirFiles = await fs.readdir(process.cwd());
    const ignored = [".safearchive", ".git", "node_modules", ".env", "package-lock.json"];
    const untracked = currentDirFiles.filter(
      (f) => !ignored.includes(f) && !stagedFiles.includes(f)
    );

    if (untracked.length > 0) {
      console.log("\n\x1b[31mUntracked files:\x1b[0m");
      console.log('  (use "safearchive add <file>..." to stage)');
      for (const file of untracked) {
        console.log(`\t\x1b[31m${file}\x1b[0m`);
      }
    }

    console.log("");
  } catch (err) {
    console.error("Error checking repository status:", err.message);
  }
}

module.exports = { statusRepo };
