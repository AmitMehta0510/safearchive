const fs = require("fs").promises;
const path = require("path");

async function initRepo() {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const commitsPath = path.join(repoPath, "commits");

  try {
    await fs.mkdir(repoPath, { recursive: true });
    await fs.mkdir(commitsPath, { recursive: true });
    await fs.writeFile(
      path.join(repoPath, "config.json"),
      JSON.stringify({
        bucket: process.env.S3_BUCKET || "",
        created: new Date().toISOString(),
        version: "1.0.0",
      })
    );
    console.log("SafeArchive repository initialised successfully in .safearchive");
  } catch (err) {
    console.error("Error initialising SafeArchive repository:", err);
  }
}

module.exports = { initRepo };