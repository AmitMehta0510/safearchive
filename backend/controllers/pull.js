const fs = require("fs").promises;
const path = require("path");
const { s3, S3_BUCKET } = require("../config/aws-config");

async function pullRepo() {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const commitsPath = path.join(repoPath, "commits");

  try {
    if (!S3_BUCKET) {
      console.error("Error: S3_BUCKET environment variable is not configured.");
      return;
    }

    await fs.mkdir(commitsPath, { recursive: true });

    const data = await s3
      .listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: "commits/",
      })
      .promise();

    const objects = data.Contents || [];
    if (objects.length === 0) {
      console.log("SafeArchive: No remote commits found in S3 bucket.");
      return;
    }

    let downloadCount = 0;
    for (const object of objects) {
      const key = object.Key;
      const pathParts = key.split("/");
      if (pathParts.length < 3) continue; // Must be commits/<commitDir>/<file>

      const commitDirName = pathParts[1];
      const commitDir = path.join(commitsPath, commitDirName);
      await fs.mkdir(commitDir, { recursive: true });

      const params = {
        Bucket: S3_BUCKET,
        Key: key,
      };

      const fileContent = await s3.getObject(params).promise();
      const destination = path.join(repoPath, key);
      await fs.writeFile(destination, fileContent.Body);
      downloadCount++;
    }

    console.log(`[SafeArchive] Successfully pulled ${downloadCount} artifacts from S3.`);
  } catch (err) {
    console.error("Unable to pull from S3:", err);
  }
}

module.exports = { pullRepo };