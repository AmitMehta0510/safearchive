const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const PersonalAccessToken = require('../models/tokenModel');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : req.header('x-auth-token')?.trim();

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied.' });
  }

  // Check if token is a Personal Access Token (PAT)
  if (token.startsWith('sat_')) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const pat = await PersonalAccessToken.findOne({ tokenHash });

      if (!pat) {
        return res.status(401).json({ message: 'Invalid Personal Access Token.' });
      }

      if (pat.expiresAt && pat.expiresAt < new Date()) {
        return res.status(401).json({ message: 'Personal Access Token has expired.' });
      }

      // Update lastUsedAt asynchronously
      pat.lastUsedAt = new Date();
      pat.save().catch((err) => console.error('Error updating PAT lastUsedAt:', err.message));

      req.user = pat.user.toString();
      req.tokenScopes = pat.scopes;
      req.authType = 'pat';
      return next();
    } catch (err) {
      console.error('PAT Authentication error:', err.message);
      return res.status(500).json({ message: 'Token authentication error.' });
    }
  }

  // Fallback to JWT Authentication
  try {
    const secret = process.env.JWT_SECRET_KEY || 'safearchive_jwt_secret';
    const decoded = jwt.verify(token, secret);
    req.user = decoded.id; // User ID from token payload
    req.authType = 'jwt';
    next();
  } catch (err) {
    console.error('JWT Authentication failed:', err.message);
    res.status(401).json({ message: 'Token is invalid or expired.' });
  }
};

module.exports = authMiddleware;
