const fs = require("fs").promises;
const path = require("path");
const https = require("https");
const http = require("http");
const { s3, S3_BUCKET } = require("../config/aws-config");

/**
 * httpPost — lightweight HTTP/HTTPS POST helper (no extra deps)
 */
function httpPost(urlStr, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
    };

    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function pushRepo() {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const commitsPath = path.join(repoPath, "commits");
  const configPath = path.join(repoPath, "config.json");

  try {
    // ── Check repo exists ─────────────────────────────────────────────────
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

    // ── Push all commits to S3 ────────────────────────────────────────────
    let uploadCount = 0;
    const commitMetas = [];

    for (const commitDir of commitDirs) {
      const commitDirPath = path.join(commitsPath, commitDir);
      const files = await fs.readdir(commitDirPath);

      // Read commit metadata
      let meta = null;
      try {
        const raw = await fs.readFile(path.join(commitDirPath, "commit.json"), "utf-8");
        meta = JSON.parse(raw);
      } catch {
        meta = { commitID: commitDir, message: "(no message)", files: [], date: new Date().toISOString() };
      }
      commitMetas.push(meta);

      for (const file of files) {
        const filePath = path.join(commitDirPath, file);
        const fileContent = await fs.readFile(filePath);
        await s3.upload({
          Bucket: S3_BUCKET,
          Key: "commits/" + commitDir + "/" + file,
          Body: fileContent,
        }).promise();
        uploadCount++;
      }
    }

    console.log("[SafeArchive] All commits (" + uploadCount + " artifacts) pushed to S3 bucket:", S3_BUCKET);

    // ── CLI → MongoDB Bridge ──────────────────────────────────────────────
    // Read config to get remote API URL and repo ID
    let config = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(raw);
    } catch {
      config = {};
    }

    const { remoteUrl, remoteRepoId, syncedCommits = [] } = config;

    if (!remoteRepoId) {
      console.log("\n[SafeArchive] Tip: Link to the web platform with:");
      console.log("  safearchive remote <mongoRepoId>");
      console.log("  Then push again to sync commits to the dashboard.");
      return;
    }

    // Read auth token from env or config
    const token = process.env.SAFEARCHIVE_TOKEN || config.token || null;
    if (!token) {
      console.log("\n[SafeArchive] Web sync skipped: no auth token found.");
      console.log("  Set SAFEARCHIVE_TOKEN=<your-jwt> in .env to enable dashboard sync.");
      return;
    }

    const apiBase = (remoteUrl || "http://localhost:3000").replace(/\/$/, "");
    const syncEndpoint = apiBase + "/repo/" + remoteRepoId + "/commit";

    console.log("\n[SafeArchive] Syncing commits to web platform...");

    let synced = 0;
    let alreadySynced = 0;
    const newlySynced = [];

    for (const meta of commitMetas) {
      // Skip already synced commits (idempotent)
      if (syncedCommits.includes(meta.commitID)) {
        alreadySynced++;
        continue;
      }

      try {
        const result = await httpPost(
          syncEndpoint,
          { commitID: meta.commitID, message: meta.message, files: meta.files || [] },
          token
        );

        if (result.status === 201 || result.status === 200) {
          newlySynced.push(meta.commitID);
          synced++;
          console.log("  synced:", meta.commitID.slice(0, 8), "-", meta.message);
        } else {
          console.error("  failed to sync commit", meta.commitID.slice(0, 8), ":", result.body?.error || result.status);
        }
      } catch (err) {
        console.error("  sync error for commit", meta.commitID.slice(0, 8), ":", err.message);
      }
    }

    // Persist newly synced commit IDs to config (avoid re-syncing)
    if (newlySynced.length > 0) {
      config.syncedCommits = [...new Set([...syncedCommits, ...newlySynced])];
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }

    if (synced > 0) {
      console.log("[SafeArchive] " + synced + " commit(s) synced to web dashboard.");
    }
    if (alreadySynced > 0) {
      console.log("[SafeArchive] " + alreadySynced + " commit(s) already synced (skipped).");
    }
  } catch (err) {
    console.error("Error pushing commits to S3:", err);
  }
}

module.exports = { pushRepo };