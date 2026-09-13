const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { getCurrentBranch } = require("./branch");

async function commitRepo(message) {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const stagedPath = path.join(repoPath, "staging");
  const commitPath = path.join(repoPath, "commits");
  const refsHeadsPath = path.join(repoPath, "refs", "heads");

  try {
    try {
      await fs.access(stagedPath);
    } catch {
      console.error("Error: Nothing staged for commit. Stage files first using 'add <file>'");
      return;
    }

    const files = await fs.readdir(stagedPath);
    if (files.length === 0) {
      console.log("SafeArchive: No staged files to commit.");
      return;
    }

    const commitID = uuidv4();
    const commitDir = path.join(commitPath, commitID);
    await fs.mkdir(commitDir, { recursive: true });
    await fs.mkdir(refsHeadsPath, { recursive: true });

    const currentBranch = await getCurrentBranch(repoPath);

    // Copy staged files to the commit directory
    for (const file of files) {
      await fs.copyFile(
        path.join(stagedPath, file),
        path.join(commitDir, file)
      );
    }

    // Write commit metadata
    await fs.writeFile(
      path.join(commitDir, "commit.json"),
      JSON.stringify(
        {
          commitID,
          message,
          files,
          branch: currentBranch,
          date: new Date().toISOString(),
        },
        null,
        2
      )
    );

    // Update branch ref
    await fs.writeFile(path.join(refsHeadsPath, currentBranch), commitID + "\n", "utf8");

    // Clean up staging area after committing
    for (const file of files) {
      await fs.unlink(path.join(stagedPath, file));
    }

    console.log(`[${currentBranch} ${commitID.slice(0, 8)}] ${message}`);
    console.log(` ${files.length} file(s) changed, staged files committed`);
  } catch (err) {
    console.error("Error committing files:", err);
  }
}

module.exports = { commitRepo };