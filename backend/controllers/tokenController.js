const crypto = require('crypto');
const PersonalAccessToken = require('../models/tokenModel');
const User = require('../models/userModel');

/**
 * Generate a new Personal Access Token
 * POST /user/tokens
 * Body: { name, expiresInDays, scopes }
 */
const generateToken = async (req, res) => {
  const userId = req.user;
  const { name, expiresInDays, scopes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Token name/description is required' });
  }

  try {
    // Generate secure token: sat_ + 40 hex chars
    const randomHex = crypto.randomBytes(20).toString('hex');
    const rawToken = 'sat_' + randomHex;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenPrefix = 'sat_' + randomHex.slice(0, 6) + '...';

    let expiresAt = null;
    if (expiresInDays && parseInt(expiresInDays) > 0) {
      const days = parseInt(expiresInDays);
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const assignedScopes = Array.isArray(scopes) && scopes.length > 0
      ? scopes
      : ['repo', 'read', 'write'];

    const pat = new PersonalAccessToken({
      user: userId,
      name: name.trim(),
      tokenHash,
      tokenPrefix,
      scopes: assignedScopes,
      expiresAt,
    });

    await pat.save();

    // Plaintext token returned ONLY once
    res.status(201).json({
      message: 'Personal Access Token created successfully. Store it safely as it cannot be shown again.',
      token: rawToken,
      id: pat._id,
      name: pat.name,
      tokenPrefix: pat.tokenPrefix,
      scopes: pat.scopes,
      expiresAt: pat.expiresAt,
      createdAt: pat.createdAt,
    });
  } catch (err) {
    console.error('Error generating personal access token:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
};

/**
 * List all active Personal Access Tokens for current user
 * GET /user/tokens
 */
const listTokens = async (req, res) => {
  const userId = req.user;

  try {
    const tokens = await PersonalAccessToken.find({ user: userId })
      .select('-tokenHash')
      .sort({ createdAt: -1 });

    res.json(tokens);
  } catch (err) {
    console.error('Error listing tokens:', err);
    res.status(500).json({ error: 'Failed to list tokens' });
  }
};

/**
 * Revoke (delete) a Personal Access Token
 * DELETE /user/tokens/:id
 */
const revokeToken = async (req, res) => {
  const userId = req.user;
  const { id } = req.params;

  try {
    const deleted = await PersonalAccessToken.findOneAndDelete({ _id: id, user: userId });
    if (!deleted) {
      return res.status(404).json({ error: 'Token not found or unauthorized' });
    }

    res.json({ message: 'Token revoked successfully' });
  } catch (err) {
    console.error('Error revoking token:', err);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
};

/**
 * Get current user profile (useful for token verification & whoami)
 * GET /user/me
 */
const getCurrentUser = async (req, res) => {
  const userId = req.user;

  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user,
      tokenScopes: req.tokenScopes || ['all'],
      authType: req.authType || 'jwt',
    });
  } catch (err) {
    console.error('Error getting current user:', err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};

module.exports = {
  generateToken,
  listTokens,
  revokeToken,
  getCurrentUser,
};

