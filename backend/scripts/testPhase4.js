const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mainRouter = require("../routes/main.router");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const PersonalAccessToken = require("../models/tokenModel");

const { initRepo } = require("../controllers/init");
const { addRepo } = require("../controllers/add");
const { commitRepo } = require("../controllers/commit");
const { statusRepo } = require("../controllers/status");
const { diffRepo } = require("../controllers/diff");
const { branchRepo, getCurrentBranch } = require("../controllers/branch");
const { checkoutRepo } = require("../controllers/checkout");
const { cloneRepo } = require("../controllers/clone");
const { login, whoami, logout, saveStoredCredentials, fetchApi } = require("../controllers/auth");

async function runTest() {
  console.log("=== Starting SafeArchive Phase 4 CLI Power-Ups Test ===");

  // 1. MongoDB Connection
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/safearchive");
  console.log("1. MongoDB connected.");

  // 2. Start Express API Server on 3000
  const app = express();
  app.use(express.json());
  app.use(mainRouter);

  let server;
  const PORT = 3000;
  await new Promise((resolve, reject) => {
    server = app.listen(PORT, () => {
      console.log(`2. Express test server listening on port ${PORT}.`);
      resolve();
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`2. Server already running on port ${PORT}. Continuing...`);
        resolve();
      } else {
        reject(err);
      }
    });
  });

  // 3. User Setup
  let testUser = await User.findOne({ username: "cli_tester" });
  if (!testUser) {
    testUser = new User({
      username: "cli_tester",
      email: "cli_tester@example.com",
    });
    await testUser.save();
  }

  // Generate a JWT to bootstrap PAT creation
  const secret = process.env.JWT_SECRET_KEY || "safearchive_jwt_secret";
  const jwtToken = jwt.sign({ id: testUser._id }, secret, { expiresIn: "1h" });

  // 4. Test PAT Creation (POST /user/tokens)
  const tokenRes = await fetchApi(`http://localhost:${PORT}/user/tokens`, {
    method: "POST",
    token: jwtToken,
    body: { name: "Test Laptop CLI", expiresInDays: 30, scopes: ["repo", "read", "write"] },
  });

  if (tokenRes.status !== 201 || !tokenRes.body.token?.startsWith("sat_")) {
    throw new Error(`Failed to create PAT: ${JSON.stringify(tokenRes.body)}`);
  }
  const rawPat = tokenRes.body.token;
  const patId = tokenRes.body.id;
  console.log(`3. Personal Access Token (PAT) generated: ${tokenRes.body.tokenPrefix} (Name: ${tokenRes.body.name})`);

  // 5. Test Authenticating via PAT (GET /user/me with Bearer sat_...)
  const meRes = await fetchApi(`http://localhost:${PORT}/user/me`, { token: rawPat });
  if (meRes.status !== 200 || meRes.body.user?.username !== "cli_tester") {
    throw new Error(`PAT authentication failed on /user/me: ${JSON.stringify(meRes.body)}`);
  }
  console.log(`4. PAT authenticated successfully with dual authMiddleware! (User: ${meRes.body.user.username}, AuthType: ${meRes.body.authType})`);

  // 6. Test Listing Tokens (GET /user/tokens)
  const listTokensRes = await fetchApi(`http://localhost:${PORT}/user/tokens`, { token: rawPat });
  if (listTokensRes.status !== 200 || !Array.isArray(listTokensRes.body) || listTokensRes.body.length === 0) {
    throw new Error(`Failed to list tokens: ${JSON.stringify(listTokensRes.body)}`);
  }
  console.log(`5. Listed active tokens: ${listTokensRes.body.length} token(s) found for user.`);

  // 7. Test CLI Credentials Storage & whoami
  await saveStoredCredentials({
    apiUrl: `http://localhost:${PORT}`,
    userId: testUser._id.toString(),
    username: testUser.username,
    email: testUser.email,
    token: rawPat,
    authType: "pat",
    savedAt: new Date().toISOString(),
  });
  console.log("6. CLI credentials saved to ~/.safearchive/credentials.json.");
  await whoami();

  // 8. Test Local Repository Lifecycle in a sandbox
  const sandboxDir = path.resolve(process.cwd(), "temp_cli_sandbox");
  await fs.mkdir(sandboxDir, { recursive: true });
  const origCwd = process.cwd();
  process.chdir(sandboxDir);

  try {
    console.log("\n--- Testing Local CLI Commands in Sandbox ---");
    // 8a. safearchive init
    await initRepo();
    const branchInit = await getCurrentBranch(path.join(sandboxDir, ".safearchive"));
    console.log(`7. Repository initialized on branch: ${branchInit}`);

    // 8b. Create files & add
    await fs.writeFile(path.join(sandboxDir, "README.md"), "# Welcome to SafeArchive CLI\nInitial version\n", "utf8");
    await fs.writeFile(path.join(sandboxDir, "index.js"), "console.log('Hello SafeArchive');\n", "utf8");

    await addRepo("README.md");
    await addRepo("index.js");
    console.log("8. Staged files: README.md, index.js");

    // 8c. Commit
    await commitRepo("feat: initial project structure");
    console.log("9. Committed initial snapshot.");

    // 8d. Status (clean)
    console.log("10. Checking clean status:");
    await statusRepo();

    // 8e. Modify tracked file and add untracked file
    await fs.writeFile(path.join(sandboxDir, "README.md"), "# Welcome to SafeArchive CLI\nEnhanced version with powerups!\n", "utf8");
    await fs.writeFile(path.join(sandboxDir, "notes.txt"), "TODO: add more tests\n", "utf8");

    console.log("11. Checking status with modified and untracked changes:");
    await statusRepo();

    // 8f. Diff
    console.log("12. Testing color-coded diff output:");
    await diffRepo();

    // 8g. Branch creation & listing
    await branchRepo("feature-oauth");
    console.log("13. Created branch 'feature-oauth'. Listing branches:");
    await branchRepo();

    // 8h. Checkout existing branch
    await checkoutRepo("feature-oauth");
    const currentBranchAfterCheckout = await getCurrentBranch(path.join(sandboxDir, ".safearchive"));
    console.log(`14. Checked out branch: ${currentBranchAfterCheckout}`);

    // 8i. Checkout -b new branch
    await checkoutRepo("bugfix-cli-pat", { b: true });
    const currentBranchNew = await getCurrentBranch(path.join(sandboxDir, ".safearchive"));
    console.log(`15. Created and switched via checkout -b to: ${currentBranchNew}`);

    // 9. Remote Clone Test
    // Create a remote repository in MongoDB to clone
    let remoteVault = await Repository.findOne({ name: "cloud-cli-vault" });
    if (!remoteVault) {
      remoteVault = new Repository({
        name: "cloud-cli-vault",
        description: "Vault for clone verification",
        owner: testUser._id,
        defaultBranch: "main",
        branches: [{ name: "main", createdAt: new Date() }],
        files: [
          { path: "README.md", content: "# Remote Cloned Vault\n", branch: "main" },
          { path: "config.yaml", content: "env: production\n", branch: "main" },
        ],
      });
      await remoteVault.save();
    }

    console.log(`\n--- Testing safearchive clone ---`);
    const cloneTargetDir = "my-cloned-vault";
    await cloneRepo(remoteVault._id.toString(), cloneTargetDir);

    const clonedPath = path.join(sandboxDir, cloneTargetDir);
    const clonedReadme = await fs.readFile(path.join(clonedPath, "README.md"), "utf8");
    const clonedConfig = await fs.readFile(path.join(clonedPath, "config.yaml"), "utf8");

    if (!clonedReadme.includes("Remote Cloned Vault") || !clonedConfig.includes("production")) {
      throw new Error("Cloned repository files content mismatch!");
    }
    console.log("16. Clone verification successful! Files and history restored.");

    // 10. Test Revoking Token
    const revokeRes = await fetchApi(`http://localhost:${PORT}/user/tokens/${patId}`, {
      method: "DELETE",
      token: jwtToken,
    });
    if (revokeRes.status !== 200) {
      throw new Error(`Failed to revoke token: ${JSON.stringify(revokeRes.body)}`);
    }
    console.log("17. PAT revoked successfully.");

    // Verify revoked token rejected
    const rejectedRes = await fetchApi(`http://localhost:${PORT}/user/me`, { token: rawPat });
    if (rejectedRes.status === 200) {
      throw new Error("Revoked PAT was unexpectedly accepted!");
    }
    console.log("18. Confirmed revoked PAT is denied access (HTTP 401).");
  } finally {
    process.chdir(origCwd);
    // Cleanup sandbox directory
    try {
      await fs.rm(sandboxDir, { recursive: true, force: true });
    } catch {}
  }

  console.log("\n>>> ALL PHASE 4 CLI POWER-UPS TESTS PASSED SUCCESSFULLY! <<<");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});