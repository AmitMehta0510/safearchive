const fs = require("fs").promises;
const path = require("path");

/**
 * remoteRepo — sets the MongoDB repository ID in .safearchive/config.json
 * Usage: safearchive remote <mongoRepoId>
 */
async function remoteRepo(repoId) {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const configPath = path.join(repoPath, "config.json");

  try {
    try {
      await fs.access(repoPath);
    } catch {
      console.error("Error: Not a SafeArchive repository. Run 'safearchive init' first.");
      return;
    }

    let config = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(raw);
    } catch {
      config = {};
    }

    config.remoteRepoId = repoId.trim();

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log("[SafeArchive] Remote repo ID set to:", repoId.trim());
    console.log("Your local commits will now sync to the web platform on next push.");
  } catch (err) {
    console.error("Error setting remote repo ID:", err.message);
  }
}

module.exports = { remoteRepo };