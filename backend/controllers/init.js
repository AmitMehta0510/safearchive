const fs = require("fs").promises;
const path = require("path");

async function initRepo() {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const commitsPath = path.join(repoPath, "commits");
  const stagingPath = path.join(repoPath, "staging");
  const refsHeadsPath = path.join(repoPath, "refs", "heads");

  try {
    await fs.mkdir(repoPath, { recursive: true });
    await fs.mkdir(commitsPath, { recursive: true });
    await fs.mkdir(stagingPath, { recursive: true });
    await fs.mkdir(refsHeadsPath, { recursive: true });

    await fs.writeFile(path.join(repoPath, "HEAD"), "ref: refs/heads/main\n", "utf8");

    await fs.writeFile(
      path.join(repoPath, "config.json"),
      JSON.stringify(
        {
          version: "1.0.0",
          created: new Date().toISOString(),
          bucket: process.env.S3_BUCKET || "",
          defaultBranch: "main",
          currentBranch: "main",
          remoteUrl: process.env.SAFEARCHIVE_API_URL || "http://localhost:3000",
          remoteRepoId: null,
          syncedCommits: [],
        },
        null,
        2
      )
    );

    console.log("SafeArchive repository initialised successfully in .safearchive/");
    console.log("On branch \x1b[36mmain\x1b[0m");
    console.log("Tip: Run 'safearchive remote <mongoRepoId>' to link to the web platform.");
  } catch (err) {
    console.error("Error initialising SafeArchive repository:", err);
  }
}

module.exports = { initRepo };
