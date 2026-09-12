const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");

const JWT_SECRET = process.env.JWT_SECRET_KEY || "safearchive_jwt_secret";

// ── Helper: parse pagination params ──────────────────────────────────────────
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ── Signup ────────────────────────────────────────────────────────────────────
const signup = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return res.status(400).json({ message: `An account with this ${field} already exists` });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, password: hashedPassword });
    const savedUser = await newUser.save();

    const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      message: "User registered successfully!",
      token,
      userId: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
    });
  } catch (err) {
    console.error("Error during signup:", err.message);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Username or email already in use" });
    }
    res.status(500).json({ message: "Server error during signup" });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials!" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

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

// ── Get All Users (paginated) ─────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  try {
    const [users, total] = await Promise.all([
      User.find({}, "-password")
        .populate("repositories")
        .populate("followedUsers", "username")
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({}),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching all users:", err.message);
    res.status(500).json({ message: "Server error fetching users" });
  }
};

// ── Search Users ──────────────────────────────────────────────────────────────
const searchUsers = async (req, res) => {
  const { q = "" } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  if (!q.trim()) {
    return res.status(400).json({ error: "Search query (q) is required" });
  }

  try {
    const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const filter = {
      $or: [{ username: searchRegex }, { email: searchRegex }],
    };

    const [users, total] = await Promise.all([
      User.find(filter, "-password")
        .select("username email repositories")
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      query: q,
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Error searching users:", err.message);
    res.status(500).json({ message: "Server error searching users" });
  }
};

// ── Get User Profile ──────────────────────────────────────────────────────────
const getUserProfile = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id, "-password")
      .populate("repositories")
      .populate({ path: "starRepos", populate: { path: "owner", select: "username" } })
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

// ── Update Profile ────────────────────────────────────────────────────────────
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

// ── Delete Profile ────────────────────────────────────────────────────────────
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

// ── Toggle Star / Unstar ──────────────────────────────────────────────────────
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

    const isStarred = user.starRepos.some((rId) => rId.toString() === repoId.toString());

    if (isStarred) {
      user.starRepos = user.starRepos.filter((rId) => rId.toString() !== repoId.toString());
    } else {
      user.starRepos.push(repoId);
    }

    await user.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("activity", {
        type: isStarred ? "repo_unstarred" : "repo_starred",
        user: user.username,
        repoName: repo.name,
        timestamp: new Date().toISOString(),
      });
    }

    const starCount = await User.countDocuments({ starRepos: repoId });
    res.json({ message: isStarred ? "Repository unstarred" : "Repository starred", isStarred: !isStarred, starCount });
  } catch (err) {
    console.error("Error toggling star:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ── Toggle Follow / Unfollow ──────────────────────────────────────────────────
const toggleFollowUser = async (req, res) => {
  const currentUserId = req.user;
  const { targetId } = req.params;

  try {
    if (currentUserId.toString() === targetId.toString()) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetId);
    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = currentUser.followedUsers.some((fId) => fId.toString() === targetId.toString());

    if (isFollowing) {
      currentUser.followedUsers = currentUser.followedUsers.filter((fId) => fId.toString() !== targetId.toString());
    } else {
      currentUser.followedUsers.push(targetId);
    }

    await currentUser.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("activity", {
        type: isFollowing ? "user_unfollowed" : "user_followed",
        user: currentUser.username,
        targetUser: targetUser.username,
        timestamp: new Date().toISOString(),
      });
    }

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

// ── Real Contribution Heatmap ─────────────────────────────────────────────────
// Activity weights: commit = 2pts, issue = 1pt, repo created = 3pts
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

    // Fetch all repos owned by user (with commits)
    const userRepos = await Repository.find({ owner: id }).select("commits _id createdAt");

    // Fetch all issues created by repos owned by user
    const repoIds = userRepos.map((r) => r._id);
    const userIssues = await Issue.find({ repository: { $in: repoIds } }).select("_id");

    // Build activity map over 365 days
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364);

    const activityMap = {};
    let totalContributions = 0;

    const toDateKey = (d) => new Date(d).toISOString().split("T")[0];

    // Count repo creations
    userRepos.forEach((repo) => {
      const dateKey = toDateKey(repo._id.getTimestamp());
      if (new Date(dateKey) >= startDate) {
        activityMap[dateKey] = (activityMap[dateKey] || 0) + 3;
        totalContributions += 3;
      }

      // Count commits per day
      (repo.commits || []).forEach((commit) => {
        const commitDate = toDateKey(commit.date);
        if (new Date(commitDate) >= startDate) {
          activityMap[commitDate] = (activityMap[commitDate] || 0) + 2;
          totalContributions += 2;
        }
      });
    });

    // Count issues
    userIssues.forEach((issue) => {
      const dateKey = toDateKey(issue._id.getTimestamp());
      if (new Date(dateKey) >= startDate) {
        activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
        totalContributions += 1;
      }
    });

    // Build continuous day array
    const data = [];
    const cur = new Date(startDate);
    while (cur <= today) {
      const dateStr = toDateKey(cur);
      data.push({ date: dateStr, count: activityMap[dateStr] || 0 });
      cur.setDate(cur.getDate() + 1);
    }

    // Calculate current streak
    let currentStreak = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].count > 0) currentStreak++;
      else break;
    }

    res.json({
      data,
      totalContributions,
      currentStreak,
      repoCount: userRepos.length,
      commitCount: userRepos.reduce((acc, r) => acc + (r.commits?.length || 0), 0),
      issueCount: userIssues.length,
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
  searchUsers,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  toggleStarRepo,
  toggleFollowUser,
  getUserContributions,
};