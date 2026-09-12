const express = require("express");
const prController = require("../controllers/prController");
const authMiddleware = require("../middleware/authMiddleware");

const prRouter = express.Router();

// ── Pull Request Endpoints ────────────────────────────────────────────────────
prRouter.get("/repo/:id/pulls/compare", prController.compareBranches);
prRouter.get("/repo/:id/pulls", prController.getRepoPullRequests);
prRouter.get("/repo/:id/pulls/:prId", prController.getPullRequestById);

prRouter.post("/repo/:id/pulls", authMiddleware, prController.createPullRequest);
prRouter.post("/repo/:id/pulls/:prId/comments", authMiddleware, prController.addPRComment);
prRouter.post("/repo/:id/pulls/:prId/merge", authMiddleware, prController.mergePullRequest);
prRouter.patch("/repo/:id/pulls/:prId/status", authMiddleware, prController.togglePRStatus);

// ── Reactions ─────────────────────────────────────────────────────────────────
prRouter.post("/repo/:id/pulls/:prId/react", authMiddleware, prController.togglePRReaction);

module.exports = prRouter;
