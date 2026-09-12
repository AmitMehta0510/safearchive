const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({ message: "No token provided, authorization denied." });
  }

  try {
    const secret = process.env.JWT_SECRET_KEY || "safearchive_jwt_secret";
    const decoded = jwt.verify(token, secret);
    req.user = decoded.id; // User ID from token payload
    next();
  } catch (err) {
    console.error("JWT Authentication failed:", err.message);
    res.status(401).json({ message: "Token is invalid or expired." });
  }
};

module.exports = authMiddleware;
