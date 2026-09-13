const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { getStoredToken, getStoredCredentials, fetchApi } = require("./auth");

/**
 * Parse repository URL, MongoDB ID, or repository name
 */
function parseRepoInput(input, defaultApiUrl) {
  let apiUrl = defaultApiUrl;
  let repoId = null;
  let repoName = null;

  const trimmed = (input || "").trim();

  // Case 1: Full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      apiUrl = `${url.protocol}//${url.hostname}${url.port ? ":" + url.port : ""}`;

      // Check pathname e.g. /repo/66e0... or /repo/name or /api/repo/66e0...
      const parts = url.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      if (/^[0-9a-fA-F]{24}$/.test(last)) {
        repoId = last;
      } else {
        repoName = last;
      }
    } catch {
      repoName = trimmed;
    }
  } else if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    // Case 2: Direct 24-hex Mongo ID
    repoId = trimmed;
  } else {
    // Case 3: Repo name
    repoName = trimmed;
  }

  return { apiUrl, repoId, repoName };
}

async function cloneRepo(repoUrl, targetDir) {
  if (!repoUrl) {
    console.error("fatal: You must specify a repository to clone.\nUsage: safearchive clone <repo-url> [directory]");
    return;
  }

  const creds = await getStoredCredentials();
  const defaultApi = (creds?.apiUrl || process.env.SAFEARCHIVE_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const token = await getStoredToken();

  const { apiUrl, repoId, repoName } = parseRepoInput(repoUrl, defaultApi);

  console.log(`Resolving remote repository from ${apiUrl}...`);

  // Fetch repo metadata
  let repo = null;
  try {
    if (repoId) {
      const res = await fetchApi(`${apiUrl}/repo/${repoId}`, { token });
      if (res.status === 200 && res.body) {
        repo = res.body;
      }
    } else if (repoName) {
      const res = await fetchApi(`${apiUrl}/repoByName/${repoName}`, { token });
      if (res.status === 200 && res.body) {
        repo = res.body;
      }
    }
  } catch (err) {
    console.error("Failed to connect to SafeArchive API:", err.message);
    return;
  }

  if (!repo || !repo._id) {
    console.error(`fatal: repository '${repoUrl}' not found or you do not have permission to read it.`);
    return;
  }

  const folderName = targetDir ? targetDir.trim() : repo.name;
  const clonePath = path.resolve(process.cwd(), folderName);

  // Check destination directory
  try {
    const existing = await fs.readdir(clonePath);
    if (existing.length > 0) {
      console.error(`fatal: destination path '${folderName}' already exists and is not an empty directory.`);
      return;
    }
  } catch {
    // Directory does not exist, will create
  }

  console.log(`Cloning into '\x1b[36m${folderName}\x1b[0m'...`);

  // Create repository layout
  const repoDotPath = path.join(clonePath, ".safearchive");
  const commitsPath = path.join(repoDotPath, "commits");
  const stagingPath = path.join(repoDotPath, "staging");
  const refsHeadsPath = path.join(repoDotPath, "refs", "heads");

  await fs.mkdir(clonePath, { recursive: true });
  await fs.mkdir(repoDotPath, { recursive: true });
  await fs.mkdir(commitsPath, { recursive: true });
  await fs.mkdir(stagingPath, { recursive: true });
  await fs.mkdir(refsHeadsPath, { recursive: true });

  const defaultBranch = repo.defaultBranch || "main";

  // Fetch commits for repository
  let commits = [];
  try {
    const commitsRes = await fetchApi(`${apiUrl}/repo/${repo._id}/commits`, { token });
    if (commitsRes.status === 200 && Array.isArray(commitsRes.body)) {
      commits = commitsRes.body;
    }
  } catch {}

  // Filter files on default branch
  const branchFiles = (repo.files || []).filter((f) => !f.branch || f.branch === defaultBranch);
  const totalObjects = branchFiles.length + commits.length;

  console.log(`remote: Enumerating objects: ${totalObjects}, done.`);
  console.log(`remote: Compressing objects: 100% (${totalObjects}/${totalObjects}), done.`);

  // Write commits into .safearchive/commits/
  const syncedCommits = [];
  let headCommitId = "";

  if (commits.length > 0) {
    for (const c of commits) {
      const cId = c.commitID || c._id.toString();
      const commitDir = path.join(commitsPath, cId);
      await fs.mkdir(commitDir, { recursive: true });

      await fs.writeFile(
        path.join(commitDir, "commit.json"),
        JSON.stringify(
          {
            commitID: cId,
            message: c.message || "",
            files: c.files || [],
            branch: c.branch || defaultBranch,
            date: c.createdAt || new Date().toISOString(),
          },
          null,
          2
        ),
        "utf8"
      );
      syncedCommits.push(cId);
      headCommitId = cId;
    }
  }

  // If no commit record existed, create initial clone snapshot commit
  if (!headCommitId) {
    headCommitId = uuidv4();
    const commitDir = path.join(commitsPath, headCommitId);
    await fs.mkdir(commitDir, { recursive: true });

    const fileNames = [];
    for (const f of branchFiles) {
      const relPath = f.path.replace(/^\//, "");
      fileNames.push(relPath);
      const commitFilePath = path.join(commitDir, relPath);
      await fs.mkdir(path.dirname(commitFilePath), { recursive: true });
      await fs.writeFile(commitFilePath, f.content || "", "utf8");
    }

    await fs.writeFile(
      path.join(commitDir, "commit.json"),
      JSON.stringify(
        {
          commitID: headCommitId,
          message: "Clone initial snapshot",
          files: fileNames,
          branch: defaultBranch,
          date: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );
    syncedCommits.push(headCommitId);
  }

  // Set branch ref and HEAD
  await fs.writeFile(path.join(refsHeadsPath, defaultBranch), `${headCommitId}\n`, "utf8");
  await fs.writeFile(path.join(repoDotPath, "HEAD"), `ref: refs/heads/${defaultBranch}\n`, "utf8");

  // Write config.json
  await fs.writeFile(
    path.join(repoDotPath, "config.json"),
    JSON.stringify(
      {
        version: "1.0.0",
        created: new Date().toISOString(),
        bucket: process.env.S3_BUCKET || "",
        defaultBranch,
        currentBranch: defaultBranch,
        remoteUrl: apiUrl,
        remoteRepoId: repo._id.toString(),
        syncedCommits,
      },
      null,
      2
    ),
    "utf8"
  );

  // Check out working files
  let checkedOut = 0;
  for (const f of branchFiles) {
    const relPath = f.path.replace(/^\//, "");
    const destPath = path.join(clonePath, relPath);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, f.content || "", "utf8");
    checkedOut++;
  }

  console.log(`Receiving objects: 100% (${totalObjects}/${totalObjects}), done.`);
  console.log(`Checking out files: 100% (${checkedOut}/${checkedOut}), done.`);
  console.log(`\x1b[32m[SafeArchive]\x1b[0m Successfully cloned repository '\x1b[1m${repo.name}\x1b[0m' into '${folderName}'`);
  console.log(`Branch '\x1b[36m${defaultBranch}\x1b[0m' set up to track remote repository.`);
}

module.exports = { cloneRepo };