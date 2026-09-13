const fs = require("fs").promises;
const path = require("path");

async function getCurrentBranch(repoPath) {
  try {
    const headContent = await fs.readFile(path.join(repoPath, "HEAD"), "utf8");
    const match = headContent.trim().match(/^ref:\s*refs\/heads\/(.+)$/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return headContent.trim() || "main";
  } catch {
    try {
      const config = JSON.parse(await fs.readFile(path.join(repoPath, "config.json"), "utf8"));
      return config.currentBranch || config.defaultBranch || "main";
    } catch {
      return "main";
    }
  }
}

async function getLatestCommitId(repoPath) {
  const commitsPath = path.join(repoPath, "commits");
  try {
    const dirs = await fs.readdir(commitsPath);
    if (dirs.length === 0) return "";
    return dirs[dirs.length - 1];
  } catch {
    return "";
  }
}

async function branchRepo(name, options = {}) {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const refsHeadsPath = path.join(repoPath, "refs", "heads");

  try {
    await fs.access(repoPath);
  } catch {
    console.error("fatal: not a SafeArchive repository (or any of the parent directories): .safearchive");
    return;
  }

  await fs.mkdir(refsHeadsPath, { recursive: true });
  const currentBranch = await getCurrentBranch(repoPath);

  // Listing branches: `safearchive branch`
  if (!name && !options.delete && !options.d) {
    try {
      const files = await fs.readdir(refsHeadsPath);
      const branches = new Set(files);
      branches.add(currentBranch);
      if (branches.size === 0) branches.add("main");

      const sorted = Array.from(branches).sort();
      for (const b of sorted) {
        if (b === currentBranch) {
          console.log(`* \x1b[32m${b}\x1b[0m`);
        } else {
          console.log(`  ${b}`);
        }
      }
    } catch (err) {
      console.error("Error listing branches:", err.message);
    }
    return;
  }

  // Deleting a branch: `safearchive branch -d <name>`
  if (options.delete || options.d) {
    const targetBranch = (name || options.delete || options.d || "").trim();
    if (!targetBranch) {
      console.error("fatal: branch name required for deletion");
      return;
    }
    if (targetBranch === currentBranch) {
      console.error(`error: Cannot delete branch '${targetBranch}' checked out at '${process.cwd()}'`);
      return;
    }
    const targetRefPath = path.join(refsHeadsPath, targetBranch);
    try {
      await fs.unlink(targetRefPath);
      console.log(`Deleted branch ${targetBranch}.`);
    } catch {
      console.error(`error: branch '${targetBranch}' not found.`);
    }
    return;
  }

  // Creating a new branch: `safearchive branch <name>`
  const branchName = name.trim();
  if (!branchName || !/^[a-zA-Z0-9._\-/]+$/.test(branchName)) {
    console.error("fatal: invalid branch name. Use alphanumeric characters, hyphens, and slashes.");
    return;
  }

  const branchRefPath = path.join(refsHeadsPath, branchName);
  try {
    await fs.access(branchRefPath);
    console.error(`fatal: a branch named '${branchName}' already exists.`);
    return;
  } catch {
    // Branch does not exist, good to create
  }

  // Determine starting commit
  let commitId = "";
  try {
    const currentRefPath = path.join(refsHeadsPath, currentBranch);
    commitId = (await fs.readFile(currentRefPath, "utf8")).trim();
  } catch {
    commitId = await getLatestCommitId(repoPath);
  }

  await fs.writeFile(branchRefPath, commitId ? commitId + "\n" : "", "utf8");
  console.log(`[SafeArchive] Branch '${branchName}' created.`);
}

module.exports = {
  branchRepo,
  getCurrentBranch,
  getLatestCommitId,
};