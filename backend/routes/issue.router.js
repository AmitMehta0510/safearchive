const express = require("express");
const issueController = require("../controllers/issueController");
const authMiddleware = require("../middleware/authMiddleware");

const issueRouter = express.Router();

issueRouter.get("/issue/all", issueController.getAllIssues);
issueRouter.get("/issue/repo/:id", issueController.getAllIssues);
issueRouter.get("/issue/:id", issueController.getIssueById);

// Protected routes
issueRouter.post("/issue/create", authMiddleware, issueController.createIssue);
issueRouter.post("/issue/create/:id", authMiddleware, issueController.createIssue);
issueRouter.put("/issue/update/:id", authMiddleware, issueController.updateIssueById);
issueRouter.delete("/issue/delete/:id", authMiddleware, issueController.deleteIssueById);

module.exports = issueRouter;
