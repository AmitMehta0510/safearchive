const { body } = require("express-validator");

// ── Signup ────────────────────────────────────────────────────────────────────
const validateSignup = [
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3, max: 30 }).withMessage("Username must be 3–30 characters")
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage("Username can only contain letters, numbers, dots (.), hyphens (-), and underscores (_)"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

// ── Login ─────────────────────────────────────────────────────────────────────
const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),
];

// ── Update Profile ────────────────────────────────────────────────────────────
const validateUpdateProfile = [
  body("email")
    .optional()
    .trim()
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .optional()
    .isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
];

module.exports = { validateSignup, validateLogin, validateUpdateProfile };