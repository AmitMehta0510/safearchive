const express = require("express");
const userController = require("../controllers/userController");
const tokenController = require("../controllers/tokenController");
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { validateSignup, validateLogin, validateUpdateProfile } = require("../validators/userValidators");

const userRouter = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
userRouter.get("/allUsers", userController.getAllUsers);
userRouter.get("/userProfile/:id", userController.getUserProfile);
userRouter.get("/user/search", userController.searchUsers);
userRouter.get("/user/contributions/:id", userController.getUserContributions);

userRouter.post("/signup", validateSignup, validate, userController.signup);
userRouter.post("/login", validateLogin, validate, userController.login);

// ── Protected Profile ─────────────────────────────────────────────────────────
userRouter.get("/user/me", authMiddleware, tokenController.getCurrentUser);
userRouter.put("/updateProfile/:id", authMiddleware, validateUpdateProfile, validate, userController.updateUserProfile);
userRouter.delete("/deleteProfile/:id", authMiddleware, userController.deleteUserProfile);

userRouter.post("/user/star/:repoId", authMiddleware, userController.toggleStarRepo);
userRouter.post("/user/follow/:targetId", authMiddleware, userController.toggleFollowUser);
userRouter.post("/user/pin/:repoId", authMiddleware, userController.togglePinRepo);

// ── Personal Access Tokens (PAT) ─────────────────────────────────────────────
userRouter.post("/user/tokens", authMiddleware, tokenController.generateToken);
userRouter.get("/user/tokens", authMiddleware, tokenController.listTokens);
userRouter.delete("/user/tokens/:id", authMiddleware, tokenController.revokeToken);

module.exports = userRouter;
