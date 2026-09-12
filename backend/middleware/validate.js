const { validationResult } = require("express-validator");

/**
 * validate — middleware to check express-validator results.
 * Place after validation chain arrays in routes.
 * Returns 422 with structured error array on failure.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: "Validation failed",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = validate;