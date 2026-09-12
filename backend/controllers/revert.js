const fs = require("fs").promises;
const path = require("path");

async function revertRepo(commitID) {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const commitsPath = path.join(repoPath, "commits");

  try {
    const commitDir = path.join(commitsPath, commitID);
    
    try {
      await fs.access(commitDir);
    } catch {
      console.error(`Error: Commit '${commitID}' not found in .safearchive/commits.`);
      return;
    }

    const files = await fs.readdir(commitDir);
    const parentDir = path.resolve(repoPath, "..");

    let restoredCount = 0;
    for (const file of files) {
      if (file === "commit.json") continue; // Keep internal commit metadata
      await fs.copyFile(path.join(commitDir, file), path.join(parentDir, file));
      restoredCount++;
      console.log(`Restored: ${file}`);
    }

    console.log(`[SafeArchive] Successfully reverted to commit ${commitID} (${restoredCount} file(s) restored).`);
  } catch (err) {
    console.error("Unable to revert commit:", err);
  }
}

module.exports = { revertRepo };