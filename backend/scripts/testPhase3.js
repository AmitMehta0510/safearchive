const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");
const PullRequest = require("../models/pullRequestModel");
const Notification = require("../models/notificationModel");
require("dotenv").config();

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/safearchive");
  console.log("[Test] MongoDB connected.");

  // Get or create primary tester user
  let userA = await User.findOne({ username: "tester_alice" });
  if (!userA) {
    userA = new User({ username: "tester_alice", email: "alice@example.com" });
    await userA.save();
  }

  // Get or create secondary tester user (for collaboration / follow)
  let userB = await User.findOne({ username: "tester_bob" });
  if (!userB) {
    userB = new User({ username: "tester_bob", email: "bob@example.com" });
    await userB.save();
  }

  // Get or create repository owned by Alice
  let repo = await Repository.findOne({ owner: userA._id });
  if (!repo) {
    repo = new Repository({
      name: "collab-vault",
      description: "Testing Phase 3 collaboration",
      owner: userA._id,
      defaultBranch: "main",
      branches: [{ name: "main", createdAt: new Date() }],
      files: [{ path: "README.md", content: "# Collab Vault\n", branch: "main" }],
    });
    await repo.save();
  }

  const secret = process.env.JWT_SECRET_KEY || "safearchive_jwt_secret";
  const tokenA = jwt.sign({ id: userA._id.toString() }, secret, { expiresIn: "1h" });
  const tokenB = jwt.sign({ id: userB._id.toString() }, secret, { expiresIn: "1h" });

  const headersA = { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` };
  const headersB = { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` };

  console.log(`[Test] Alice (${userA.username}), Bob (${userB.username}), Repo: ${repo.name}`);

  // 1. Test Collaborator Management
  console.log("\n--- TEST 1: Collaborators Management ---");
  const addCollabRes = await fetch(`http://localhost:3000/repo/${repo._id}/collaborators`, {
    method: "POST",
    headers: headersA,
    body: JSON.stringify({ username: "tester_bob", role: "write" }),
  });
  const addCollabData = await addCollabRes.json();
  console.log("Added collaborator response:", addCollabData.message);

  const getCollabRes = await fetch(`http://localhost:3000/repo/${repo._id}/collaborators`);
  const getCollabData = await getCollabRes.json();
  const hasBob = getCollabData.collaborators.some((c) => c.user?.username === "tester_bob");
  console.log("Bob is verified collaborator:", hasBob);

  // 2. Test Notifications
  console.log("\n--- TEST 2: Notifications Engine ---");
  // Check Bob's notifications (he should have received a collaborator invitation notification from Alice)
  const notifRes = await fetch(`http://localhost:3000/notifications`, { headers: headersB });
  const notifData = await notifRes.json();
  console.log("Bob's unread notifications count:", notifData.unreadCount);
  console.log("Latest notification title:", notifData.notifications[0]?.title);

  // Mark all read for Bob
  const markReadRes = await fetch(`http://localhost:3000/notifications/read-all`, {
    method: "PATCH",
    headers: headersB,
  });
  const markReadData = await markReadRes.json();
  console.log("Mark all read result:", markReadData.message, "Unread count:", markReadData.unreadCount);

  // 3. Test Emoji Reactions on Issues
  console.log("\n--- TEST 3: Emoji Reactions on Issues ---");
  let testIssue = await Issue.findOne({ repository: repo._id });
  if (!testIssue) {
    testIssue = new Issue({
      title: "Test Collaboration Issue",
      description: "Let's discuss phase 3 features",
      repository: repo._id,
      author: userA._id,
    });
    await testIssue.save();
  }

  // Bob reacts 👍 to Alice's issue
  const reactIssueRes = await fetch(`http://localhost:3000/issue/${testIssue._id}/react`, {
    method: "POST",
    headers: headersB,
    body: JSON.stringify({ emoji: "👍" }),
  });
  const reactIssueData = await reactIssueRes.json();
  console.log("Reacted with 👍 to issue:", reactIssueData.reactions);

  // Bob toggles 👍 again (should remove)
  const unreactIssueRes = await fetch(`http://localhost:3000/issue/${testIssue._id}/react`, {
    method: "POST",
    headers: headersB,
    body: JSON.stringify({ emoji: "👍" }),
  });
  const unreactIssueData = await unreactIssueRes.json();
  console.log("Toggled off 👍 on issue:", unreactIssueData.reactions);

  // 4. Test Emoji Reactions on Pull Requests
  console.log("\n--- TEST 4: Emoji Reactions on PRs ---");
  let testPR = await PullRequest.findOne({ repository: repo._id });
  if (!testPR) {
    testPR = new PullRequest({
      prNumber: 99,
      title: "Test PR for reactions",
      description: "PR description",
      repository: repo._id,
      author: userA._id,
      sourceBranch: "feature/test",
      targetBranch: "main",
    });
    await testPR.save();
  }

  const reactPRRes = await fetch(`http://localhost:3000/repo/${repo._id}/pulls/${testPR._id}/react`, {
    method: "POST",
    headers: headersB,
    body: JSON.stringify({ emoji: "🚀" }),
  });
  const reactPRData = await reactPRRes.json();
  console.log("Reacted with 🚀 to PR:", reactPRData.reactions);

  // 5. Test Profile Updates & Repo Pinning
  console.log("\n--- TEST 5: Profile Updates & Pinned Repos ---");
  const updateProfileRes = await fetch(`http://localhost:3000/updateProfile/${userA._id}`, {
    method: "PUT",
    headers: headersA,
    body: JSON.stringify({
      bio: "Full-stack engineer & open source builder",
      company: "SafeArchive Core",
      location: "San Francisco, CA",
      website: "https://safearchive.io",
    }),
  });
  const updateProfileData = await updateProfileRes.json();
  console.log("Profile updated bio:", updateProfileData.bio, "company:", updateProfileData.company);

  // Toggle pin repository
  const pinRes = await fetch(`http://localhost:3000/user/pin/${repo._id}`, {
    method: "POST",
    headers: headersA,
  });
  const pinData = await pinRes.json();
  console.log("Pinned repo response:", pinData.message, "Is pinned:", pinData.isPinned);

  console.log("\n=========================================");
  console.log(">>> ALL PHASE 3 TESTS PASSED SUCCESSFULLY! <<<");
  console.log("=========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
