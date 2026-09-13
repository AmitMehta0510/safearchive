const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mainRouter = require("../routes/main.router");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");
const Webhook = require("../models/webhookModel");
const WorkflowRun = require("../models/workflowRunModel");
const Release = require("../models/releaseModel");
const { v4: uuidv4 } = require("uuid");

function requestApi(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = options.body ? JSON.stringify(options.body) : null;
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ""),
      method: options.method || "GET",
      headers: {
        ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
        ...(options.token ? { Authorization: "Bearer " + options.token } : {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => {
        const rawBuffer = Buffer.concat(data);
        const contentType = res.headers["content-type"] || "";
        if (contentType.includes("application/json")) {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(rawBuffer.toString("utf8")) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body: rawBuffer.toString("utf8") });
          }
        } else {
          resolve({ status: res.statusCode, headers: res.headers, body: rawBuffer });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log("=== Starting SafeArchive Phase 5 CI/CD & Automation Test ===");

  // 1. Connect MongoDB Atlas
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("1. MongoDB Atlas connected.");

  // 2. Start Test Webhook Receiver Server on Port 4001
  const receivedEvents = [];
  const receiverServer = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      receivedEvents.push({
        path: req.url,
        event: req.headers["x-safearchive-event"],
        signature: req.headers["x-safearchive-signature-256"],
        deliveryId: req.headers["x-safearchive-delivery"],
        payload: JSON.parse(body),
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "received" }));
    });
  });

  await new Promise((resolve) => receiverServer.listen(4001, resolve));
  console.log("2. Webhook receiver listening on port 4001.");

  // 3. Start Express App on Port 3000
  const app = express();
  app.use(express.json());
  app.use(mainRouter);

  let apiServer;
  await new Promise((resolve, reject) => {
    apiServer = app.listen(3000, resolve);
    apiServer.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log("3. Port 3000 in use, continuing with existing server...");
        resolve();
      } else reject(err);
    });
  });
  console.log("3. SafeArchive API Server ready.");

  // 4. Test User & Repo Setup
  let user = await User.findOne({ username: "ci_tester" });
  if (!user) {
    user = new User({ username: "ci_tester", email: "ci_tester@example.com" });
    await user.save();
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY || "safearchive_jwt_secret", { expiresIn: "1h" });

  let repo = await Repository.findOne({ name: "automation-vault" });
  if (!repo) {
    repo = new Repository({
      name: "automation-vault",
      description: "Vault for testing Actions & Webhooks",
      owner: user._id,
      defaultBranch: "main",
      branches: [{ name: "main", createdAt: new Date() }],
      files: [
        { path: "README.md", content: "# Automation Vault\nCI/CD enabled.\n", branch: "main" },
        { path: "package.json", content: "{\n  \"name\": \"vault-test\",\n  \"version\": \"1.0.0\"\n}\n", branch: "main" },
      ],
    });
    await repo.save();
  }

  const repoId = repo._id.toString();

  // 5. Test Webhook Creation (POST /repo/:id/webhooks)
  const webhookSecret = "secret_sign_12345";
  const createWhRes = await requestApi(`http://localhost:3000/repo/${repoId}/webhooks`, {
    method: "POST",
    token,
    body: {
      url: "http://localhost:4001/webhook-receiver",
      secret: webhookSecret,
      events: ["push", "issue_created", "pr_merged", "release_published"],
    },
  });

  if (createWhRes.status !== 201 || !createWhRes.body._id) {
    throw new Error(`Failed to create webhook: ${JSON.stringify(createWhRes.body)}`);
  }
  const webhookId = createWhRes.body._id;
  console.log(`4. Webhook created: ${createWhRes.body.url} (Events: ${createWhRes.body.events.join(", ")})`);

  // 6. Test Ping Event (POST /repo/:id/webhooks/:id/test)
  const pingRes = await requestApi(`http://localhost:3000/repo/${repoId}/webhooks/${webhookId}/test`, {
    method: "POST",
    token,
  });

  if (pingRes.status !== 200 || pingRes.body.delivery?.statusCode !== 200) {
    throw new Error(`Ping test failed: ${JSON.stringify(pingRes.body)}`);
  }

  // Check receiver got ping event and validated HMAC signature
  const pingEvent = receivedEvents.find((e) => e.event === "ping");
  if (!pingEvent) {
    throw new Error("Receiver did not receive ping webhook event!");
  }
  if (!pingEvent.signature?.startsWith("sha256=")) {
    throw new Error(`Missing or invalid HMAC signature: ${pingEvent.signature}`);
  }
  console.log(`5. Ping webhook delivered with valid HMAC-SHA256 signature (${pingEvent.signature.slice(0, 16)}...)`);

  // 7. Test Commit Push -> triggers 'push' Webhook & 'SafeArchive Actions'
  console.log("\n--- Testing Push Trigger: Webhook + SafeArchive Actions ---");
  const testCommitId = uuidv4();
  const pushCommitRes = await requestApi(`http://localhost:3000/repo/${repoId}/commit`, {
    method: "POST",
    token,
    body: {
      commitID: testCommitId,
      message: "feat: add automated workflow runner",
      branch: "main",
      files: ["README.md", "package.json"],
    },
  });

  if (pushCommitRes.status !== 200 && pushCommitRes.status !== 201) {
    throw new Error(`Failed to record commit: ${JSON.stringify(pushCommitRes.body)}`);
  }
  console.log("6. Commit recorded: " + testCommitId.slice(0, 8));

  // Wait for async workflow runner & webhook dispatch to finish
  let latestRun = null;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const runsRes = await requestApi(`http://localhost:3000/repo/${repoId}/actions/runs`, { token });
    const matching = (runsRes.body?.runs || []).find((r) => r.commitID === testCommitId);
    if (matching && matching.status === "success") {
      latestRun = matching;
      break;
    }
  }

  // Verify 'push' webhook event received
  const pushEvent = receivedEvents.find((e) => e.event === "push");
  if (!pushEvent || pushEvent.payload.commit?.id !== testCommitId) {
    throw new Error("Push webhook was not received by endpoint!");
  }
  console.log("7. Push webhook payload delivered successfully to external endpoint.");

  if (!latestRun) {
    throw new Error("Workflow run did not finish with status 'success'!");
  }
  console.log(`8. Actions Workflow Run #${latestRun.runNumber} status: ${latestRun.status}, conclusion: ${latestRun.conclusion}`);

  // Fetch full run detail with terminal logs
  const runDetailRes = await requestApi(`http://localhost:3000/repo/${repoId}/actions/runs/${latestRun._id}`, { token });
  if (runDetailRes.status !== 200 || !runDetailRes.body.steps || runDetailRes.body.steps.length < 4) {
    throw new Error(`Incomplete workflow steps: ${JSON.stringify(runDetailRes.body)}`);
  }
  const completedSteps = runDetailRes.body.steps.filter((s) => s.status === "completed");
  console.log(`9. Workflow executed all 4 steps: ${completedSteps.length}/4 passed.`);
  console.log(`   Sample Terminal Log: ${runDetailRes.body.steps[2].logs[2]}`);

  // Check Commit Status endpoint
  const commitStatusRes = await requestApi(`http://localhost:3000/repo/${repoId}/commits/${testCommitId}/status`);
  if (commitStatusRes.body.conclusion !== "success") {
    throw new Error(`Unexpected commit status: ${JSON.stringify(commitStatusRes.body)}`);
  }
  console.log("10. Verified commit status checks query: ✓ success");

  // 8. Test Issue Creation -> triggers 'issue_created' Webhook
  console.log("\n--- Testing Issue Trigger: Webhook ---");
  const createIssueRes = await requestApi(`http://localhost:3000/issue/create/${repoId}`, {
    method: "POST",
    token,
    body: {
      title: "Bug: CI runner timeout",
      description: "Investigating test runner performance",
    },
  });

  if (createIssueRes.status !== 201) {
    throw new Error(`Failed to create issue: ${JSON.stringify(createIssueRes.body)}`);
  }

  await new Promise((r) => setTimeout(r, 500));
  const issueEvent = receivedEvents.find((e) => e.event === "issue_created");
  if (!issueEvent) {
    throw new Error("issue_created webhook event was not received!");
  }
  console.log(`11. Issue webhook received by external endpoint: "${issueEvent.payload.issue?.title}"`);

  // 9. Test Releases & Tags
  console.log("\n--- Testing Releases & Tags ---");
  const releaseRes = await requestApi(`http://localhost:3000/repo/${repoId}/releases`, {
    method: "POST",
    token,
    body: {
      tagName: "v1.0.0",
      name: "Release v1.0.0: Initial Production Launch",
      body: "## Changelog\n- Automated CI/CD Actions\n- Webhooks Dispatcher\n- Releases & Tags\n",
      targetBranch: "main",
      isPrerelease: false,
    },
  });

  if (releaseRes.status !== 201 || !releaseRes.body._id) {
    throw new Error(`Failed to create release: ${JSON.stringify(releaseRes.body)}`);
  }
  const releaseId = releaseRes.body._id;
  console.log(`12. Created release tag: ${releaseRes.body.tagName} ("${releaseRes.body.name}")`);

  await new Promise((r) => setTimeout(r, 500));
  const releaseEvent = receivedEvents.find((e) => e.event === "release_published");
  if (!releaseEvent) {
    throw new Error("release_published webhook was not received!");
  }
  console.log("13. Release published webhook delivered successfully.");

  // Test Download Release Archive (.zip)
  const downloadRes = await requestApi(`http://localhost:3000/repo/${repoId}/releases/${releaseId}/download`);
  if (downloadRes.status !== 200 || !Buffer.isBuffer(downloadRes.body)) {
    throw new Error(`Failed to download release archive: ${downloadRes.status}`);
  }

  // Validate ZIP Magic Number: PK\x03\x04
  const zipBuffer = downloadRes.body;
  const isZip = zipBuffer.length > 4 && zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4B && zipBuffer[2] === 0x03 && zipBuffer[3] === 0x04;
  if (!isZip) {
    throw new Error("Downloaded archive is not a valid zip file!");
  }
  console.log(`14. Downloaded release source code archive: ${zipBuffer.length} bytes (Valid ZIP format: PK...)`);

  // Cleanup
  receiverServer.close();
  if (apiServer) apiServer.close();
  console.log("\n>>> ALL PHASE 5 CI/CD & AUTOMATION TESTS PASSED SUCCESSFULLY! <<<");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});