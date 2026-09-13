const fs = require("fs").promises;
const path = require("path");
const { getCurrentBranch, getLatestCommitId } = require("./branch");

async function checkoutRepo(branchName, options = {}) {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const refsHeadsPath = path.join(repoPath, "refs", "heads");
  const commitsPath = path.join(repoPath, "commits");

  try {
    await fs.access(repoPath);
  } catch {
    console.error("fatal: not a SafeArchive repository (or any of the parent directories): .safearchive");
    return;
  }

  if (!branchName || typeof branchName !== "string") {
    console.error("fatal: branch name required for checkout");
    return;
  }

  const target = branchName.trim();
  const currentBranch = await getCurrentBranch(repoPath);
  const isCreate = Boolean(options.b || options.create);
  const targetRefPath = path.join(refsHeadsPath, target);

  await fs.mkdir(refsHeadsPath, { recursive: true });

  let exists = false;
  try {
    await fs.access(targetRefPath);
    exists = true;
  } catch {
    // If target is "main" and no ref file exists yet, check if repo is fresh
    if (target === "main") {
      exists = true;
    }
  }

  if (isCreate) {
    if (exists) {
      console.error(`fatal: a branch named '${target}' already exists.`);
      return;
    }
    // Create new branch pointing to current branch's commit
    let baseCommit = "";
    try {
      baseCommit = (await fs.readFile(path.join(refsHeadsPath, currentBranch), "utf8")).trim();
    } catch {
      baseCommit = await getLatestCommitId(repoPath);
    }
    await fs.writeFile(targetRefPath, baseCommit ? baseCommit + "\n" : "", "utf8");
  } else if (!exists) {
    console.error(`error: pathspec '${target}' did not match any file(s) known to safearchive`);
    return;
  }

  // Restore files if switching to a branch with a commit snapshot
  let targetCommitId = "";
  try {
    targetCommitId = (await fs.readFile(targetRefPath, "utf8")).trim();
  } catch {}

  if (targetCommitId) {
    const commitDir = path.join(commitsPath, targetCommitId);
    try {
      const files = await fs.readdir(commitDir);
      for (const file of files) {
        if (file === "commit.json") continue;
        const sourcePath = path.join(commitDir, file);
        const destPath = path.resolve(process.cwd(), file);
        await fs.copyFile(sourcePath, destPath);
      }
    } catch (err) {
      console.warn(`warning: could not fully restore files for commit ${targetCommitId.slice(0, 8)}:`, err.message);
    }
  }

  // Update HEAD
  await fs.writeFile(path.join(repoPath, "HEAD"), `ref: refs/heads/${target}\n`, "utf8");

  // Update config.json
  const configPath = path.join(repoPath, "config.json");
  try {
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    config.currentBranch = target;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
  } catch {}

  if (isCreate) {
    console.log(`Switched to a new branch '\x1b[36m${target}\x1b[0m'`);
  } else {
    console.log(`Switched to branch '\x1b[36m${target}\x1b[0m'`);
  }
}

module.exports = { checkoutRepo };