// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');
// JWT_SECRET must be set in environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}
const SECRET_KEY = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.log('Auth: No token provided');
    return res.status(401).json({ error: 'Token missing' });
  }

  jwt.verify(token, SECRET_KEY, async (err, user) => {
    if (err) {
      console.log('Auth: Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid token', details: err.message });
    }
    
    try {
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
      
      // Update user object with current role from database
      req.user = { ...user, role: userData.role };
      next();
      
    } catch (dbError) {
      console.error('Authentication database error:', dbError);
      return res.status(500).json({ 
        error: 'Authentication check failed',
        details: dbError.message 
      });
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
