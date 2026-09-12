const { body } = require("express-validator");

// ── Create Issue ──────────────────────────────────────────────────────────────
const validateCreateIssue = [
  body("title")
    .trim()
    .notEmpty().withMessage("Issue title is required")
    .isLength({ min: 3, max: 200 }).withMessage("Issue title must be 3–200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage("Description must be under 2000 characters"),
];

// ── Update Issue ──────────────────────────────────────────────────────────────
const validateUpdateIssue = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage("Issue title must be 3–200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage("Description must be under 2000 characters"),

  body("status")
    .optional()
    .isIn(["open", "closed"]).withMessage("Status must be 'open' or 'closed'"),
];

module.exports = { validateCreateIssue, validateUpdateIssue };