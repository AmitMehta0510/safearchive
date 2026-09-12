const express = require("express");
const repoController = require("../controllers/repoController");
const authMiddleware = require("../middleware/authMiddleware");

const repoRouter = express.Router();

// Public read endpoints
repoRouter.get("/repo/all", repoController.getAllRepositories);
repoRouter.get("/repo/:id", repoController.getRepositoryById);
repoRouter.get("/repo/:id/commits", repoController.getRepoCommits);
repoRouter.get("/repo/name/:name", repoController.fetchRepositoryByName);
repoRouter.get("/repo/user/:userID", repoController.fetchRepositoriesForCurrentUser);

// Protected mutation endpoints
repoRouter.post("/repo/create", authMiddleware, repoController.createRepository);
repoRouter.post("/repo/:id/commit", authMiddleware, repoController.recordCommit);
repoRouter.put("/repo/update/:id", authMiddleware, repoController.updateRepositoryById);
repoRouter.patch("/repo/toggle/:id", authMiddleware, repoController.toggleVisibilityById);
repoRouter.delete("/repo/delete/:id", authMiddleware, repoController.deleteRepositoryById);

module.exports = repoRouter;
