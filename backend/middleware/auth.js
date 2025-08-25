// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../db');
const SECRET_KEY = process.env.JWT_SECRET || 'your-super-secret';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, SECRET_KEY, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    
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
      
      // For staff roles (administrator, supervisor, teacher), check employment status
      if (['administrator', 'supervisor', 'teacher'].includes(userData.role)) {
        let employmentTable;
        switch (userData.role) {
          case 'administrator': employmentTable = 'administrators'; break;
          case 'supervisor': employmentTable = 'supervisors'; break;
          case 'teacher': employmentTable = 'teachers'; break;
        }
        
        const employmentResult = await db.query(
          `SELECT status FROM ${employmentTable} WHERE id = $1`,
          [user.id]
        );
        
        if (employmentResult.rows.length === 0) {
          return res.status(403).json({ error: 'Employment record not found. Contact administrator.' });
        }
        
        const employmentStatus = employmentResult.rows[0].status;
        if (employmentStatus !== 'active') {
          return res.status(403).json({ 
            error: employmentStatus === 'inactive' ? 
              'Your employment is inactive. Contact administrator.' :
              'You are currently on leave. Contact administrator.' 
          });
        }
      }
      
      // Update user object with current role from database
      req.user = { ...user, role: userData.role };
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
