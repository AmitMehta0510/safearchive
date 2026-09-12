const { body } = require("express-validator");

// ── Create Repository ─────────────────────────────────────────────────────────
const validateCreateRepo = [
  body("name")
    .trim()
    .notEmpty().withMessage("Repository name is required")
    .isLength({ min: 1, max: 100 }).withMessage("Repository name must be 1–100 characters")
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage("Repository name can only contain letters, numbers, hyphens (-), underscores (_), and dots (.)"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Description must be under 500 characters"),

  body("visibility")
    .optional()
    .isIn(["public", "private"]).withMessage("Visibility must be 'public' or 'private'"),
];

// ── Record Commit ─────────────────────────────────────────────────────────────
const validateRecordCommit = [
  body("commitID")
    .trim()
    .notEmpty().withMessage("Commit ID is required")
    .isUUID().withMessage("Commit ID must be a valid UUID"),

  body("message")
    .trim()
    .notEmpty().withMessage("Commit message is required")
    .isLength({ max: 500 }).withMessage("Commit message must be under 500 characters"),

  body("files")
    .optional()
    .isArray().withMessage("Files must be an array"),

  body("files.*")
    .optional()
    .isString().withMessage("Each file entry must be a string"),
];

// ── Update Repository ─────────────────────────────────────────────────────────
const validateUpdateRepo = [
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Description must be under 500 characters"),
];

module.exports = { validateCreateRepo, validateRecordCommit, validateUpdateRepo };