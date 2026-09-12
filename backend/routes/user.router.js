const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const userRouter = express.Router();

userRouter.get("/allUsers", userController.getAllUsers);
userRouter.post("/signup", userController.signup);
userRouter.post("/login", userController.login);
userRouter.get("/userProfile/:id", userController.getUserProfile);
userRouter.put("/updateProfile/:id", authMiddleware, userController.updateUserProfile);
userRouter.delete("/deleteProfile/:id", authMiddleware, userController.deleteUserProfile);

// Real-time Collaboration & Metrics routes
userRouter.post("/user/star/:repoId", authMiddleware, userController.toggleStarRepo);
userRouter.post("/user/follow/:targetId", authMiddleware, userController.toggleFollowUser);
userRouter.get("/user/contributions/:id", userController.getUserContributions);

module.exports = userRouter;
