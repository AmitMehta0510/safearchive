const express = require("express");
const repoController = require("../controllers/repoController");
const authMiddleware = require("../middleware/authMiddleware");
const ownershipMiddleware = require("../middleware/ownershipMiddleware");

const repoRouter = express.Router();

// --- Public read-only endpoints ---
repoRouter.get("/repo/all", repoController.getAllRepositories);
repoRouter.get("/repo/name/:name", repoController.fetchRepositoryByName);
repoRouter.get("/repo/user/:userID", repoController.fetchRepositoriesForCurrentUser);
repoRouter.get("/repo/:id", repoController.getRepositoryById);
repoRouter.get("/repo/:id/commits", repoController.getRepoCommits);

// --- Protected: requires login only ---
repoRouter.post("/repo/create", authMiddleware, repoController.createRepository);
repoRouter.post("/repo/:id/commit", authMiddleware, repoController.recordCommit);

// --- Protected: requires login AND repo ownership ---
repoRouter.put("/repo/update/:id", authMiddleware, ownershipMiddleware, repoController.updateRepositoryById);
repoRouter.patch("/repo/toggle/:id", authMiddleware, ownershipMiddleware, repoController.toggleVisibilityById);
repoRouter.delete("/repo/delete/:id", authMiddleware, ownershipMiddleware, repoController.deleteRepositoryById);

module.exports = repoRouter;
