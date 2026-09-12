const fs = require("fs").promises;
const path = require("path");

async function addRepo(filePath) {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const stagingPath = path.join(repoPath, "staging");

  try {
    // Check if repo initialized
    try {
      await fs.access(repoPath);
    } catch {
      console.error("Error: Not a SafeArchive repository. Run 'safearchive init' first.");
      return;
    }

    await fs.mkdir(stagingPath, { recursive: true });
    const resolvedFilePath = path.resolve(process.cwd(), filePath);
    const fileName = path.basename(filePath);

    await fs.copyFile(resolvedFilePath, path.join(stagingPath, fileName));
    console.log(`File '${fileName}' added to the SafeArchive staging area!`);
  } catch (err) {
    console.error("Error adding file to staging area:", err.message);
  }
}

module.exports = { addRepo };
