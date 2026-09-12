const fs = require("fs").promises;
const path = require("path");

async function logRepo() {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const commitsPath = path.join(repoPath, "commits");

  try {
    try {
      await fs.access(commitsPath);
    } catch {
      console.error("Error: Not a SafeArchive repository or no commits found. Run 'safearchive init' first.");
      return;
    }

    const commitDirs = await fs.readdir(commitsPath);
    if (commitDirs.length === 0) {
      console.log("SafeArchive: No commits recorded yet.");
      return;
    }

    const commitList = [];

    for (const dir of commitDirs) {
      const metaPath = path.join(commitsPath, dir, "commit.json");
      try {
        const content = await fs.readFile(metaPath, "utf-8");
        const metadata = JSON.parse(content);
        commitList.push(metadata);
      } catch {
        // Fallback if metadata missing
        commitList.push({
          commitID: dir,
          message: "(No commit message)",
          date: "Unknown",
          files: [],
        });
      }
    }

    // Sort by date descending
    commitList.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`\n=== SafeArchive Commit Log (${commitList.length} total) ===\n`);
    for (const c of commitList) {
      console.log(`\x1b[33mcommit ${c.commitID}\x1b[0m`);
      console.log(`Date:    ${new Date(c.date).toLocaleString()}`);
      console.log(`Files:   ${(c.files || []).join(", ") || "None recorded"}`);
      console.log(`\n    ${c.message}\n`);
      console.log("-".repeat(50));
    }
  } catch (err) {
    console.error("Error reading SafeArchive commit history:", err.message);
  }
}

module.exports = { logRepo };
