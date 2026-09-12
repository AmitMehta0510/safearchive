const express = require("express");
const issueController = require("../controllers/issueController");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { validateCreateIssue, validateUpdateIssue } = require("../validators/issueValidators");

const issueRouter = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
issueRouter.get("/issue/all", issueController.getAllIssues);            // ?page=1&limit=20
issueRouter.get("/issue/repo/:id", issueController.getAllIssues);
issueRouter.get("/issue/:id", issueController.getIssueById);

// ── Protected ─────────────────────────────────────────────────────────────────
issueRouter.post("/issue/create", authMiddleware, validateCreateIssue, validate, issueController.createIssue);
issueRouter.post("/issue/create/:id", authMiddleware, validateCreateIssue, validate, issueController.createIssue);
issueRouter.put("/issue/update/:id", authMiddleware, validateUpdateIssue, validate, issueController.updateIssueById);
issueRouter.delete("/issue/delete/:id", authMiddleware, issueController.deleteIssueById);

module.exports = issueRouter;