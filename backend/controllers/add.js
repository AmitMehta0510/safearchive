const fs = require("fs").promises;
const path = require("path");

const IGNORED = [
  ".safearchive",
  ".git",
  "node_modules",
  ".env",
  "package-lock.json",
  "dist",
  "build",
];

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
    const target = filePath || ".";
    const resolvedFilePath = path.resolve(process.cwd(), target);

    let stat;
    try {
      stat = await fs.stat(resolvedFilePath);
    } catch {
      console.error(`Error: Path '${target}' does not exist.`);
      return;
    }

    if (stat.isDirectory()) {
      const entries = await fs.readdir(resolvedFilePath);
      let stagedCount = 0;
      for (const entry of entries) {
        if (IGNORED.includes(entry)) continue;
        const entryPath = path.join(resolvedFilePath, entry);
        try {
          const entryStat = await fs.stat(entryPath);
          if (entryStat.isFile()) {
            await fs.copyFile(entryPath, path.join(stagingPath, entry));
            console.log(`Staged: ${entry}`);
            stagedCount++;
          }
        } catch {}
      }
      if (stagedCount === 0) {
        console.log("No files found to stage.");
      } else {
        console.log(`\n[SafeArchive] Successfully staged ${stagedCount} file(s) into .safearchive/staging/`);
      }
      return;
    }

    const fileName = path.basename(filePath);
    await fs.copyFile(resolvedFilePath, path.join(stagingPath, fileName));
    console.log(`File '${fileName}' added to the SafeArchive staging area!`);
  } catch (err) {
    console.error("Error adding file to staging area:", err.message);
  }
}

module.exports = { addRepo };
