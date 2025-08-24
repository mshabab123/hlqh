// Role-Based Access Control Middleware
const db = require('../db');

// Define role hierarchy and permissions
const ROLES = {
  ADMIN: 'admin',
  ADMINISTRATOR: 'administrator', 
  SUPERVISOR: 'supervisor',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student'
};

const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 5,          // Highest level - can do everything
  [ROLES.ADMINISTRATOR]: 4,   // School administrator
  [ROLES.SUPERVISOR]: 3,      // School supervisor
  [ROLES.TEACHER]: 2,         // Teacher
  [ROLES.PARENT]: 1,          // Parent
  [ROLES.STUDENT]: 0          // Lowest level
};

// Enhanced authorization middleware
const requireRole = (minimumRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRole = req.user.role?.toLowerCase();
      const userLevel = ROLE_HIERARCHY[userRole];
      const requiredLevel = ROLE_HIERARCHY[minimumRole];

      if (userLevel === undefined || userLevel < requiredLevel) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: minimumRole,
          current: userRole 
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

// Check if user can access specific school data
const requireSchoolAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role?.toLowerCase();
    const userId = req.user.id;

    // Admin can access everything
    if (userRole === ROLES.ADMIN) {
      return next();
    }

    // Get school_id from request params or body
    const targetSchoolId = req.params.school_id || req.body.school_id;
    
    if (!targetSchoolId) {
      return res.status(400).json({ error: 'School ID required' });
    }

    // Get user's school association
    let userSchoolId = null;
    
    if (userRole === ROLES.ADMINISTRATOR) {
      const result = await db.query(
        'SELECT school_id FROM administrators WHERE id = $1', 
        [userId]
      );
      userSchoolId = result.rows[0]?.school_id;
    } else if (userRole === ROLES.SUPERVISOR) {
      const result = await db.query(
        'SELECT school_id FROM supervisors WHERE id = $1', 
        [userId]
      );
      userSchoolId = result.rows[0]?.school_id;
    } else if (userRole === ROLES.TEACHER) {
      const result = await db.query(
        'SELECT school_id FROM teachers WHERE id = $1', 
        [userId]
      );
      userSchoolId = result.rows[0]?.school_id;
    }

    if (userSchoolId !== parseInt(targetSchoolId)) {
      return res.status(403).json({ 
        error: 'Access denied: Different school',
        userSchool: userSchoolId,
        requestedSchool: targetSchoolId
      });
    }

    next();
  } catch (error) {
    console.error('School access check error:', error);
    res.status(500).json({ error: 'School access check failed' });
  }
};

// Check if user can manage other users
const canManageUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role?.toLowerCase();
    const targetUserId = req.params.user_id || req.body.target_user_id;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID required' });
    }

    // Admin can manage everyone
    if (userRole === ROLES.ADMIN) {
      return next();
    }

    // Get target user's role
    const targetResult = await db.query(
      'SELECT u.role FROM users u WHERE u.id = $1', 
      [targetUserId]
    );

    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const targetRole = targetResult.rows[0].role?.toLowerCase();
    const currentUserLevel = ROLE_HIERARCHY[userRole];
    const targetUserLevel = ROLE_HIERARCHY[targetRole];

    // Users cannot manage users of equal or higher level
    if (currentUserLevel <= targetUserLevel) {
      return res.status(403).json({ 
        error: 'Cannot manage users of equal or higher privilege level',
        current: userRole,
        target: targetRole
      });
    }

    // Additional restrictions for supervisors
    if (userRole === ROLES.SUPERVISOR) {
      // Supervisors cannot edit other supervisors or admins
      if (targetRole === ROLES.SUPERVISOR || targetRole === ROLES.ADMINISTRATOR || targetRole === ROLES.ADMIN) {
        return res.status(403).json({ 
          error: 'Supervisors cannot manage other supervisors, administrators, or admins' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('User management check error:', error);
    res.status(500).json({ error: 'User management check failed' });
  }
};

// Get user permissions based on role and school
const getUserPermissions = async (userId) => {
  try {
    const userResult = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const userRole = userResult.rows[0].role?.toLowerCase();
    let schoolId = null;

    // Get school association for non-admin users
    if (userRole !== ROLES.ADMIN) {
      let query, table;
      
      switch (userRole) {
        case ROLES.ADMINISTRATOR:
          table = 'administrators';
          break;
        case ROLES.SUPERVISOR:
          table = 'supervisors';
          break;
        case ROLES.TEACHER:
          table = 'teachers';
          break;
        default:
          table = null;
      }

      if (table) {
        const schoolResult = await db.query(
          `SELECT school_id FROM ${table} WHERE id = $1`,
          [userId]
        );
        schoolId = schoolResult.rows[0]?.school_id;
      }
    }

    return {
      role: userRole,
      level: ROLE_HIERARCHY[userRole],
      schoolId,
      permissions: {
        canViewAllSchools: userRole === ROLES.ADMIN,
        canManageUsers: [ROLES.ADMIN, ROLES.ADMINISTRATOR, ROLES.SUPERVISOR].includes(userRole),
        canManageClasses: [ROLES.ADMIN, ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TEACHER].includes(userRole),
        canViewReports: [ROLES.ADMIN, ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TEACHER].includes(userRole),
        canManageSchools: userRole === ROLES.ADMIN,
        canManagePrivileges: userRole === ROLES.ADMIN
      }
    };
  } catch (error) {
    console.error('Get permissions error:', error);
    return null;
  }
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  requireRole,
  requireSchoolAccess,
  canManageUser,
  getUserPermissions
};