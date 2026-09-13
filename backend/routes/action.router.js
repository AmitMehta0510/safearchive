const express = require("express");
const actionController = require("../controllers/actionController");
const authMiddleware = require("../middleware/authMiddleware");

const actionRouter = express.Router();

actionRouter.get("/repo/:id/actions/runs", actionController.listWorkflowRuns);
actionRouter.get("/repo/:id/actions/runs/:runId", actionController.getWorkflowRun);
actionRouter.post("/repo/:id/actions/runs/:runId/rerun", authMiddleware, actionController.rerunWorkflow);
actionRouter.post("/repo/:id/actions/dispatch", authMiddleware, actionController.dispatchWorkflow);
actionRouter.get("/repo/:id/commits/:commitId/status", actionController.getCommitStatus);

module.exports = actionRouter;