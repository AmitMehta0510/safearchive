const express = require("express");
const releaseController = require("../controllers/releaseController");
const authMiddleware = require("../middleware/authMiddleware");

const releaseRouter = express.Router();

releaseRouter.get("/repo/:id/releases", releaseController.listReleases);
releaseRouter.get("/repo/:id/releases/:releaseId", releaseController.getReleaseById);
releaseRouter.post("/repo/:id/releases", authMiddleware, releaseController.createRelease);
releaseRouter.put("/repo/:id/releases/:releaseId", authMiddleware, releaseController.updateRelease);
releaseRouter.delete("/repo/:id/releases/:releaseId", authMiddleware, releaseController.deleteRelease);
releaseRouter.get("/repo/:id/releases/:releaseId/download", releaseController.downloadReleaseArchive);

module.exports = releaseRouter;