// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { hashToken } = require('../config/security');
const { getRequestToken } = require('../utils/cookies');
// JWT_SECRET must be set in environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}
const SECRET_KEY = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const token = getRequestToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  jwt.verify(token, SECRET_KEY, async (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
      // Ensure the token maps to a live, non-revoked session. This lets us
      // invalidate tokens server-side (logout, password change/reset) before
      // their natural JWT expiry.
      const sessionResult = await db.query(
        `SELECT is_active, expires_at FROM user_sessions WHERE token_hash = $1`,
        [hashToken(token)]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(401).json({ error: 'Session not found or revoked' });
      }

      const session = sessionResult.rows[0];
      if (session.is_active === false) {
        return res.status(401).json({ error: 'Session has been revoked. Please log in again.' });
      }
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }

      // Check if user account is active
      const userResult = await db.query(
        'SELECT id, role, is_active FROM users WHERE id = $1',
        [user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: 'User account not found' });
      }

      const userData = userResult.rows[0];

      // Check if user account is deactivated
      if (!userData.is_active) {
        return res.status(403).json({ error: 'Account deactivated. Contact administrator.' });
      }

      // For staff roles, we now rely on the is_active field in users table
      // The old employment status checking is removed as we use users.role column
      // If needed, additional status checks can be added here later

      // Update user object with current role from database.
      // Keep the raw token so downstream handlers (e.g. logout) can revoke it.
      req.user = { ...user, role: userData.role };
      req.token = token;
      next();

    } catch (dbError) {
      console.error('Authentication database error:', dbError);
      return res.status(500).json({ error: 'Authentication check failed' });
    }
  });
}

// 🛡️ Authorization: Allow only if user role matches
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient role' });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
