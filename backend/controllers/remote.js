const fs = require("fs").promises;
const path = require("path");
const https = require("https");
const http = require("http");

/**
 * httpGet — lightweight HTTP/HTTPS GET helper (no extra deps)
 */
function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === "https:" ? https : http;
    lib.get(urlStr, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on("error", reject);
  });
}

/**
 * resolveRepoId — resolves a "username/reponame" slug or raw MongoDB ID to a repo ID.
 * If the input looks like "user/repo", hits the /repo/name/:name endpoint.
 * Otherwise returns the input as-is (assumed to be a MongoDB ObjectId).
 */
async function resolveRepoId(input, apiBase) {
  const trimmed = input.trim();

  // If it contains a slash → treat as username/reponame
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(
        "Invalid format. Use 'username/reponame' or a raw Repository ID."
      );
    }
    const repoName = parts[1];
    const url = `${apiBase}/repo/name/${encodeURIComponent(repoName)}`;

    console.log(`[SafeArchive] Resolving repository "${trimmed}"...`);
    const result = await httpGet(url);

    if (result.status === 404) {
      throw new Error(
        `Repository "${trimmed}" not found. Check the username and repo name.`
      );
    }
    if (result.status !== 200) {
      throw new Error(
        `Failed to resolve repository: ${result.body?.error || result.status}`
      );
    }

    // Verify owner username matches
    const ownerUsername = result.body?.owner?.username;
    if (ownerUsername && ownerUsername.toLowerCase() !== parts[0].toLowerCase()) {
      throw new Error(
        `Repository "${parts[1]}" exists but is owned by "${ownerUsername}", not "${parts[0]}".`
      );
    }

    const repoId = result.body?._id;
    if (!repoId) {
      throw new Error("Could not extract repository ID from server response.");
    }

    console.log(`[SafeArchive] Resolved "${trimmed}" → ID: ${repoId}`);
    return repoId;
  }

  // No slash → treat as raw MongoDB ID
  return trimmed;
}

/**
 * remoteRepo — sets the remote repository in .safearchive/config.json
 * Supports two formats:
 *   safearchive remote username/reponame    (human-readable)
 *   safearchive remote <mongoRepoId>        (legacy raw ID)
 */
async function remoteRepo(repoIdOrSlug) {
  const repoPath = path.resolve(process.cwd(), ".safearchive");
  const configPath = path.join(repoPath, "config.json");

  try {
    try {
      await fs.access(repoPath);
    } catch {
      console.error(
        "Error: Not a SafeArchive repository. Run 'safearchive init' first."
      );
      return;
    }

    let config = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(raw);
    } catch {
      config = {};
    }

    const apiBase = (config.remoteUrl || "https://safearchive-5plv.onrender.com").replace(/\/$/, "");

    // Resolve slug → ID
    const repoId = await resolveRepoId(repoIdOrSlug, apiBase);

    config.remoteRepoId = repoId;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log("[SafeArchive] Remote set to repository ID:", repoId);
    console.log("Your local commits will now sync to the web platform on next push.");
  } catch (err) {
    console.error("Error setting remote:", err.message);
  }
}

module.exports = { remoteRepo };