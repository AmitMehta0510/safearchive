const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");
const dotenv = require("dotenv");

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET_KEY || "safearchive_jwt_secret";

const signup = async (req, res) => {
  const { username, password, email } = req.body;

  try {
    if (!username || !password || !email) {
      return res.status(400).json({ message: "Username, email, and password are required." });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.username === username ? "Username already exists" : "Email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      repositories: [],
      followedUsers: [],
      starRepos: [],
    });

    const savedUser = await newUser.save();

    const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      userId: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
    });
  } catch (err) {
    console.error("Error during signup:", err.message);
    res.status(500).json({ message: "Server error during registration" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials!" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      userId: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password")
      .populate("repositories")
      .populate("followedUsers", "username");
    res.json(users);
  } catch (err) {
    console.error("Error fetching all users:", err.message);
    res.status(500).json({ message: "Server error fetching users" });
  }
};

const getUserProfile = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id, "-password")
      .populate("repositories")
      .populate({
        path: "starRepos",
        populate: { path: "owner", select: "username" },
      })
      .populate("followedUsers", "username");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err.message);
    res.status(500).json({ message: "Server error fetching user profile" });
  }
};

const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;

  try {
    const updateFields = {};
    if (email) updateFields.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, select: "-password" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating user profile:", err.message);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

const deleteUserProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await User.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user profile:", err.message);
    res.status(500).json({ message: "Server error deleting profile" });
  }
};

// Toggle Star / Unstar repository
const toggleStarRepo = async (req, res) => {
  const userId = req.user;
  const { repoId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const user = await User.findById(userId);
    const repo = await Repository.findById(repoId);
    if (!user || !repo) {
      return res.status(404).json({ error: "User or Repository not found" });
    }

    const isStarred = user.starRepos.some(
      (rId) => rId.toString() === repoId.toString()
    );

    if (isStarred) {
      user.starRepos = user.starRepos.filter(
        (rId) => rId.toString() !== repoId.toString()
      );
    } else {
      user.starRepos.push(repoId);
    }

    await user.save();

    // Broadcast live activity event
    const io = req.app.get("io");
    if (io) {
      io.emit("activity", {
        type: isStarred ? "repo_unstarred" : "repo_starred",
        user: user.username,
        repoName: repo.name,
        timestamp: new Date().toISOString(),
      });
    }

    // Return current star state and total count across users
    const starCount = await User.countDocuments({ starRepos: repoId });

    res.json({
      message: isStarred ? "Repository unstarred" : "Repository starred",
      isStarred: !isStarred,
      starCount,
    });
  } catch (err) {
    console.error("Error toggling star:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Toggle Follow / Unfollow User
const toggleFollowUser = async (req, res) => {
  const currentUserId = req.user;
  const { targetId } = req.params;

  try {
    if (currentUserId === targetId) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetId);
    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = currentUser.followedUsers.some(
      (fId) => fId.toString() === targetId.toString()
    );

    if (isFollowing) {
      currentUser.followedUsers = currentUser.followedUsers.filter(
        (fId) => fId.toString() !== targetId.toString()
      );
    } else {
      currentUser.followedUsers.push(targetId);
    }

    await currentUser.save();

    // Broadcast live activity event
    const io = req.app.get("io");
    if (io) {
      io.emit("activity", {
        type: isFollowing ? "user_unfollowed" : "user_followed",
        user: currentUser.username,
        targetUser: targetUser.username,
        timestamp: new Date().toISOString(),
      });
    }

    // Count followers of target user
    const followersCount = await User.countDocuments({ followedUsers: targetId });

    res.json({
      message: isFollowing ? "Unfollowed user" : "Followed user",
      isFollowing: !isFollowing,
      followersCount,
      followingCount: currentUser.followedUsers.length,
    });
  } catch (err) {
    console.error("Error toggling follow:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Calculate real 365-day contribution data
const getUserContributions = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userRepos = await Repository.find({ owner: id });
    const repoCount = userRepos.length;
    const totalFiles = userRepos.reduce(
      (acc, r) => acc + (r.content?.length || 0),
      0
    );

    // Build timeline for the last 180-365 days
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 120); // 120 days rolling window for readable heatmap

    const activityMap = {};
    let totalContributions = 0;

    // Seed activity from real repositories and creation dates
    userRepos.forEach((repo) => {
      const repoDate = repo._id.getTimestamp().toISOString().split("T")[0];
      activityMap[repoDate] = (activityMap[repoDate] || 0) + 3;
      totalContributions += 3;
    });

    const data = [];
    const cur = new Date(startDate);
    while (cur <= today) {
      const dateStr = cur.toISOString().split("T")[0];
      const count = activityMap[dateStr] || 0;
      data.push({
        date: dateStr,
        count: count,
      });
      cur.setDate(cur.getDate() + 1);
    }

    res.json({
      data,
      totalContributions,
      repoCount,
      totalFiles,
      startDate: startDate.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    });
  } catch (err) {
    console.error("Error generating contributions:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  signup,
  login,
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  toggleStarRepo,
  toggleFollowUser,
  getUserContributions,
};
