const express = require("express");
const repoController = require("../controllers/repoController");
const authMiddleware = require("../middleware/authMiddleware");
const ownershipMiddleware = require("../middleware/ownershipMiddleware");
const validate = require("../middleware/validate");
const { validateCreateRepo, validateRecordCommit, validateUpdateRepo } = require("../validators/repoValidators");

const repoRouter = express.Router();

// ── Public read-only endpoints ────────────────────────────────────────────────
repoRouter.get("/repo/all", repoController.getAllRepositories);        // ?page=1&limit=10
repoRouter.get("/repo/search", repoController.searchRepositories);     // ?q=term&page=1&limit=10
repoRouter.get("/repo/name/:name", repoController.fetchRepositoryByName);
repoRouter.get("/repo/user/:userID", repoController.fetchRepositoriesForCurrentUser); // ?page=1&limit=10
repoRouter.get("/repo/:id", repoController.getRepositoryById);
repoRouter.get("/repo/:id/commits", repoController.getRepoCommits);

// --- Phase 1: In-Browser Code, Tree, Diff & Archive ---
repoRouter.get("/repo/:id/tree", repoController.getRepoTree);
repoRouter.get("/repo/:id/file", repoController.getFileContent);
repoRouter.get("/repo/:id/commits/:commitId/diff", repoController.getCommitDiff);
repoRouter.get("/repo/:id/archive/zip", repoController.downloadRepoZip);
repoRouter.post("/repo/:id/file", authMiddleware, repoController.createOrUpdateFile);

// --- Phase 2: Multi-Branch Management ---
repoRouter.get("/repo/:id/branches", repoController.getBranches);
repoRouter.post("/repo/:id/branches", authMiddleware, repoController.createBranch);
repoRouter.delete("/repo/:id/branches/:branchName", authMiddleware, repoController.deleteBranch);

// --- Phase 3: Collaborators Management ---
repoRouter.get("/repo/:id/collaborators", repoController.getCollaborators);
repoRouter.post("/repo/:id/collaborators", authMiddleware, repoController.addCollaborator);
repoRouter.delete("/repo/:id/collaborators/:userId", authMiddleware, repoController.removeCollaborator);

// ── Protected: login required ─────────────────────────────────────────────────
repoRouter.post("/repo/create", authMiddleware, validateCreateRepo, validate, repoController.createRepository);
repoRouter.post("/repo/:id/commit", authMiddleware, validateRecordCommit, validate, repoController.recordCommit);

// ── Protected: login + ownership required ─────────────────────────────────────
repoRouter.put("/repo/update/:id", authMiddleware, ownershipMiddleware, validateUpdateRepo, validate, repoController.updateRepositoryById);
repoRouter.patch("/repo/toggle/:id", authMiddleware, ownershipMiddleware, repoController.toggleVisibilityById);
repoRouter.delete("/repo/delete/:id", authMiddleware, ownershipMiddleware, repoController.deleteRepositoryById);

module.exports = repoRouter;
