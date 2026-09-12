const mongoose = require("mongoose");
const Repository = require("../models/repoModel");

/**
 * ownershipMiddleware
 * -------------------
 * Must be used AFTER authMiddleware (req.user is the authenticated user's ID).
 * Checks that the authenticated user is the owner of the repository
 * identified by req.params.id before allowing the mutation to proceed.
 *
 * Usage:
 *   router.delete("/repo/delete/:id", authMiddleware, ownershipMiddleware, handler);
 */
const ownershipMiddleware = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const repository = await Repository.findById(id).select("owner");
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    if (repository.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to modify this repository.",
      });
    }

    next();
  } catch (err) {
    console.error("[ownershipMiddleware] Error:", err.message);
    res.status(500).json({ error: "Server error during ownership check" });
  }
};

module.exports = ownershipMiddleware;
