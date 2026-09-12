const fs = require("fs").promises;
const path = require("path");
const { s3, S3_BUCKET } = require("../config/aws-config");

async function pushRepo() {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const commitsPath = path.join(repoPath, "commits");

  try {
    try {
      await fs.access(commitsPath);
    } catch {
      console.error("Error: No commits directory found in .safearchive. Nothing to push.");
      return;
    }

    if (!S3_BUCKET) {
      console.error("Error: S3_BUCKET environment variable is not configured.");
      return;
    }

    const commitDirs = await fs.readdir(commitsPath);
    if (commitDirs.length === 0) {
      console.log("SafeArchive: No commits to push.");
      return;
    }

    let uploadCount = 0;
    for (const commitDir of commitDirs) {
      const commitPath = path.join(commitsPath, commitDir);
      const files = await fs.readdir(commitPath);

      for (const file of files) {
        const filePath = path.join(commitPath, file);
        const fileContent = await fs.readFile(filePath);
        const params = {
          Bucket: S3_BUCKET,
          Key: `commits/${commitDir}/${file}`,
          Body: fileContent,
        };

        await s3.upload(params).promise();
        uploadCount++;
      }
    }

    console.log(`[SafeArchive] All commits (${uploadCount} artifacts) pushed to S3 bucket: ${S3_BUCKET}`);
  } catch (err) {
    console.error("Error pushing commits to S3:", err);
  }
}

module.exports = { pushRepo };
