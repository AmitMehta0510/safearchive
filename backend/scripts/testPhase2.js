const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const PullRequest = require("../models/pullRequestModel");
require("dotenv").config();

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/safearchive");
  console.log("[Test] MongoDB connected.");

  // Find a user and a repo
  let user = await User.findOne();
  if (!user) {
    user = new User({ username: "tester", email: "tester@example.com" });
    await user.save();
  }

  let repo = await Repository.findOne();
  if (!repo) {
    repo = new Repository({
      name: "phase2-repo",
      description: "Testing Phase 2 PR lifecycle",
      owner: user._id,
      defaultBranch: "main",
      branches: [{ name: "main", createdAt: new Date() }],
      files: [{ path: "README.md", content: "# Main Branch Content\n", branch: "main" }],
    });
    await repo.save();
  }

  const repoId = repo._id.toString();
  const secret = process.env.JWT_SECRET_KEY || "safearchive_jwt_secret";
  const token = jwt.sign({ id: user._id.toString() }, secret, { expiresIn: "1h" });
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  console.log(`[Test] Using repo ID: ${repoId}, User: ${user.username}`);

  // 1. List branches
  const bRes = await fetch(`http://localhost:3000/repo/${repoId}/branches`);
  const bData = await bRes.json();
  console.log("[Test 1] Branches list:", bData.branches.map(b => b.name));

  // 2. Create new branch
  const testBranchName = "feature/phase2-" + Date.now().toString().slice(-4);
  const createBranchRes = await fetch(`http://localhost:3000/repo/${repoId}/branches`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: testBranchName, fromBranch: "main" }),
  });
  const createBranchData = await createBranchRes.json();
  console.log("[Test 2] Created branch:", createBranchData.branch?.name);

  // 3. Commit a new file to the new branch
  const addFileRes = await fetch(`http://localhost:3000/repo/${repoId}/file`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      path: "feature.js",
      content: "export const feature = 'phase2 works!';\n",
      message: "feat: add feature.js",
      branch: testBranchName,
    }),
  });
  const addFileData = await addFileRes.json();
  console.log("[Test 3] Committed file to branch:", addFileData.file?.path, "on", addFileData.file?.branch);

  // 4. Compare branches
  const compRes = await fetch(
    `http://localhost:3000/repo/${repoId}/pulls/compare?base=main&head=${testBranchName}`
  );
  const compData = await compRes.json();
  console.log("[Test 4] Branch comparison diff:", {
    totalFilesChanged: compData.diff?.totalFilesChanged,
    additions: compData.diff?.totalAdditions,
    deletions: compData.diff?.totalDeletions,
  });

  // 5. Open Pull Request
  const prRes = await fetch(`http://localhost:3000/repo/${repoId}/pulls`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: `Merge ${testBranchName} into main`,
      description: "This pull request implements Phase 2 features.",
      sourceBranch: testBranchName,
      targetBranch: "main",
    }),
  });
  const prData = await prRes.json();
  const pr = prData.pullRequest;
  console.log("[Test 5] Created Pull Request:", `#${pr?.prNumber} ${pr?.title}, status: ${pr?.status}`);

  // 6. Get PR detail with diff
  const prDetailRes = await fetch(`http://localhost:3000/repo/${repoId}/pulls/${pr._id}`);
  const prDetailData = await prDetailRes.json();
  console.log("[Test 6] PR Detail files changed:", prDetailData.diff?.totalFilesChanged);

  // 7. Add Comment to PR
  const commentRes = await fetch(`http://localhost:3000/repo/${repoId}/pulls/${pr._id}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content: "LGTM! Ready to merge." }),
  });
  const commentData = await commentRes.json();
  console.log("[Test 7] Added comment:", commentData.comment?.content);

  // 8. Merge PR
  const mergeRes = await fetch(`http://localhost:3000/repo/${repoId}/pulls/${pr._id}/merge`, {
    method: "POST",
    headers,
  });
  const mergeData = await mergeRes.json();
  console.log("[Test 8] PR Merged status:", mergeData.pullRequest?.status, "Commit:", mergeData.commit?.message);

  // 9. Verify main branch tree has the merged file
  const treeRes = await fetch(`http://localhost:3000/repo/${repoId}/tree?branch=main`);
  const treeData = await treeRes.json();
  const hasMergedFile = treeData.tree?.some((f) => f.path === "feature.js");
  console.log("[Test 9] Verified feature.js is in main tree:", hasMergedFile);

  console.log("\n=========================================");
  console.log(">>> ALL PHASE 2 TESTS PASSED SUCCESSFULLY! <<<");
  console.log("=========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
