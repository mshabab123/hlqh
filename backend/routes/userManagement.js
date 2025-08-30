const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, canManageUser, getUserPermissions, ROLES } = require('../middleware/rbac');

const router = express.Router();

// GET /api/user-management/users - Get all users (Admin only)
router.get('/users', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { role, school_id, status, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.role, u.is_active, u.created_at,
        CASE 
          WHEN u.role = 'administrator' THEN a.school_id
          WHEN u.role = 'supervisor' THEN s.school_id  
          WHEN u.role = 'teacher' THEN t.school_id
          ELSE NULL 
        END as school_id,
        CASE 
          WHEN u.role = 'administrator' THEN sc1.name
          WHEN u.role = 'supervisor' THEN sc2.name
          WHEN u.role = 'teacher' THEN sc3.name
          ELSE NULL 
        END as school_name,
        CASE 
          WHEN u.role = 'administrator' THEN a.status
          WHEN u.role = 'supervisor' THEN s.status
          WHEN u.role = 'teacher' THEN t.status
          ELSE 'active'
        END as employment_status
      FROM users u
      LEFT JOIN administrators a ON u.id = a.id AND u.role = 'administrator'
      LEFT JOIN supervisors s ON u.id = s.id AND u.role = 'supervisor' 
      LEFT JOIN teachers t ON u.id = t.id AND u.role = 'teacher'
      LEFT JOIN schools sc1 ON a.school_id = sc1.id
      LEFT JOIN schools sc2 ON s.school_id = sc2.id
      LEFT JOIN schools sc3 ON t.school_id = sc3.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (school_id) {
      query += ` AND (a.school_id = $${paramIndex} OR s.school_id = $${paramIndex} OR t.school_id = $${paramIndex})`;
      params.push(school_id);
      paramIndex++;
    }

    if (status) {
      if (status === 'active') {
        query += ` AND u.is_active = true`;
      } else if (status === 'inactive') {
        query += ` AND u.is_active = false`;
      }
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await db.query(query, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users u WHERE 1=1 ${role ? 'AND u.role = $1' : ''}`;
    const countResult = await db.query(countQuery, role ? [role] : []);
    
    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/user-management/users/:id - Get specific user details (Admin only)
router.get('/users/:id', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.address, u.date_of_birth, u.role, u.is_active, u.created_at,
        CASE 
          WHEN u.role = 'administrator' THEN a.school_id
          WHEN u.role = 'supervisor' THEN s.school_id  
          WHEN u.role = 'teacher' THEN t.school_id
          ELSE NULL 
        END as school_id,
        CASE 
          WHEN u.role = 'administrator' THEN a.hire_date
          WHEN u.role = 'supervisor' THEN s.hire_date
          WHEN u.role = 'teacher' THEN t.hire_date
          ELSE NULL 
        END as hire_date,
        CASE 
          WHEN u.role = 'administrator' THEN a.salary
          WHEN u.role = 'supervisor' THEN s.salary
          WHEN u.role = 'teacher' THEN t.salary
          ELSE NULL 
        END as salary,
        CASE 
          WHEN u.role = 'administrator' THEN a.status
          WHEN u.role = 'supervisor' THEN s.status
          WHEN u.role = 'teacher' THEN t.status
          ELSE 'active'
        END as employment_status,
        CASE 
          WHEN u.role = 'administrator' THEN a.qualifications
          WHEN u.role = 'supervisor' THEN s.qualifications
          WHEN u.role = 'teacher' THEN t.qualifications
          ELSE NULL 
        END as qualifications,
        CASE 
          WHEN u.role = 'administrator' THEN a.permissions
          WHEN u.role = 'supervisor' THEN s.permissions
          WHEN u.role = 'teacher' THEN t.permissions
          ELSE NULL 
        END as permissions
      FROM users u
      LEFT JOIN administrators a ON u.id = a.id AND u.role = 'administrator'
      LEFT JOIN supervisors s ON u.id = s.id AND u.role = 'supervisor' 
      LEFT JOIN teachers t ON u.id = t.id AND u.role = 'teacher'
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// PUT /api/user-management/users/:id/role - Update user role (Admin only)
router.put('/users/:id/role', 
  authenticateToken, 
  requireRole(ROLES.ADMIN),
  [
    body('role').isIn(['admin', 'administrator', 'supervisor', 'teacher', 'parent', 'student'])
      .withMessage('Invalid role'),
    body('school_id').optional().isUUID().withMessage('Invalid school ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const { id } = req.params;
      const { role, school_id, salary, qualifications, permissions } = req.body;

      const client = await db.connect();
      await client.query('BEGIN');

      try {
        // Check if user exists
        const userResult = await client.query('SELECT role FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'User not found' });
        }

        const oldRole = userResult.rows[0].role;

        // Update user role
        await client.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

        // Remove from old role table
        if (oldRole === 'administrator') {
          await client.query('DELETE FROM administrators WHERE id = $1', [id]);
        } else if (oldRole === 'supervisor') {
          await client.query('DELETE FROM supervisors WHERE id = $1', [id]);
        } else if (oldRole === 'teacher') {
          await client.query('DELETE FROM teachers WHERE id = $1', [id]);
        } else if (oldRole === 'admin') {
          await client.query('DELETE FROM admins WHERE id = $1', [id]);
        }

        // Add to new role table
        if (role === 'administrator') {
          await client.query(`
            INSERT INTO administrators (id, school_id, salary, qualifications, permissions)
            VALUES ($1, $2, $3, $4, $5)
          `, [id, school_id, salary, qualifications, permissions]);
        } else if (role === 'supervisor') {
          await client.query(`
            INSERT INTO supervisors (id, school_id, salary, qualifications, permissions)
            VALUES ($1, $2, $3, $4, $5)
          `, [id, school_id, salary, qualifications, permissions]);
        } else if (role === 'teacher') {
          await client.query(`
            INSERT INTO teachers (id, school_id, salary, qualifications, permissions)
            VALUES ($1, $2, $3, $4, $5)
          `, [id, school_id, salary, qualifications, permissions]);
        } else if (role === 'admin') {
          await client.query(`
            INSERT INTO admins (id, salary, qualifications, permissions)
            VALUES ($1, $2, $3, $4)
          `, [id, salary, qualifications, permissions]);
        }

        await client.query('COMMIT');
        res.json({ message: 'User role updated successfully', newRole: role });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

// PUT /api/user-management/users/:id/status - Update user status (Admin only)
router.put('/users/:id/status', 
  authenticateToken, 
  requireRole(ROLES.ADMIN),
  [
    body('is_active').isBoolean().withMessage('Status must be boolean'),
    body('employment_status').optional().isIn(['active', 'inactive', 'on_leave'])
      .withMessage('Invalid employment status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const { id } = req.params;
      const { is_active, employment_status } = req.body;

      const client = await db.connect();
      await client.query('BEGIN');

      try {
        // Update user active status
        await client.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, id]);

        // Update employment status if applicable
        if (employment_status) {
          const userResult = await client.query('SELECT role FROM users WHERE id = $1', [id]);
          const role = userResult.rows[0]?.role;

          if (role === 'administrator') {
            await client.query('UPDATE administrators SET status = $1 WHERE id = $2', [employment_status, id]);
          } else if (role === 'supervisor') {
            await client.query('UPDATE supervisors SET status = $1 WHERE id = $2', [employment_status, id]);
          } else if (role === 'teacher') {
            await client.query('UPDATE teachers SET status = $1 WHERE id = $2', [employment_status, id]);
          }
        }

        await client.query('COMMIT');
        res.json({ message: 'User status updated successfully' });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }
);

// GET /api/user-management/roles - Get available roles and their permissions
router.get('/roles', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const roles = [
      {
        name: 'admin',
        displayName: 'مدير النظام',
        level: 5,
        description: 'صلاحية كاملة على النظام',
        permissions: [
          'إدارة جميع المدارس',
          'إدارة جميع المستخدمين', 
          'تغيير الصلاحيات',
          'عرض جميع التقارير',
          'إدارة إعدادات النظام'
        ]
      },
      {
        name: 'administrator',
        displayName: 'مدير مدرسة',
        level: 4,
        description: 'صلاحية إدارة المدرسة المخصصة له',
        permissions: [
          'إدارة مدرسة واحدة',
          'إدارة المشرفين والمعلمين في مدرسته',
          'إدارة الطلاب والفصول',
          'عرض تقارير المدرسة'
        ]
      },
      {
        name: 'supervisor',
        displayName: 'مشرف',
        level: 3,
        description: 'صلاحية إشرافية في المدرسة',
        permissions: [
          'إدارة المعلمين في مدرسته',
          'إدارة الطلاب والفصول',
          'عرض التقارير',
          'لا يمكنه تعديل المشرفين الآخرين'
        ]
      },
      {
        name: 'teacher',
        displayName: 'معلم',
        level: 2,
        description: 'صلاحية إدارة الفصول المخصصة له',
        permissions: [
          'إدارة فصوله فقط',
          'إدارة درجات الطلاب',
          'عرض تقارير فصوله'
        ]
      },
      {
        name: 'parent',
        displayName: 'ولي أمر',
        level: 1,
        description: 'عرض بيانات أطفاله فقط',
        permissions: [
          'عرض بيانات أطفاله',
          'عرض تقارير تقدم أطفاله'
        ]
      },
      {
        name: 'student',
        displayName: 'طالب',
        level: 0,
        description: 'عرض بياناته الشخصية فقط',
        permissions: [
          'عرض بياناته الشخصية',
          'عرض درجاته وتقدمه'
        ]
      }
    ];

    res.json({ roles });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /api/user-management/permissions/:userId - Get user permissions
router.get('/permissions/:userId', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { userId } = req.params;
    const permissions = await getUserPermissions(userId);
    
    if (!permissions) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ permissions });

  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

// GET /api/user-management/all-users - Get all users for password management (Admin only)
router.get('/all-users', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, first_name, second_name, third_name, last_name,
        email, phone, role, is_active
      FROM users 
      ORDER BY role, first_name, last_name
    `);
    
    res.json({ users: result.rows });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/user-management/password-reset-users - Get users for password reset based on role
router.get('/password-reset-users', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let query;
    let params = [];
    
    if (userRole === 'admin') {
      // Admin can reset passwords for all users
      query = `
        SELECT 
          id, first_name, second_name, third_name, last_name,
          email, phone, role, is_active
        FROM users 
        ORDER BY role, first_name, last_name
      `;
    } else if (userRole === 'administrator') {
      // Administrator can only reset passwords for students in their school
      query = `
        SELECT DISTINCT
          u.id, u.first_name, u.second_name, u.third_name, u.last_name,
          u.email, u.phone, u.role, u.is_active
        FROM users u
        JOIN students s ON u.id = s.id
        JOIN classes c ON s.class_id = c.id
        JOIN administrators a ON c.school_id = a.school_id
        WHERE u.role = 'student' 
          AND a.id = $1
          AND u.is_active = true
        ORDER BY u.first_name, u.last_name
      `;
      params = [userId];
    } else {
      // Other roles don't have password reset permissions
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    
    const result = await db.query(query, params);
    res.json({ users: result.rows });

  } catch (error) {
    console.error('Get password reset users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/user-management/reset-password - Reset user password (Admin and Administrator)
router.post('/reset-password', 
  authenticateToken,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const { userId, newPassword } = req.body;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      // Check if user exists
      const userResult = await db.query(
        'SELECT id, first_name, last_name, email, role FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const targetUser = userResult.rows[0];

      // Authorization check
      if (currentUserRole === 'administrator') {
        // Administrator can only reset passwords for students in their school
        if (targetUser.role !== 'student') {
          return res.status(403).json({ error: 'Administrators can only reset student passwords' });
        }

        // Check if the student belongs to administrator's school
        const schoolCheck = await db.query(`
          SELECT 1
          FROM users u
          JOIN students s ON u.id = s.id
          JOIN classes c ON s.class_id = c.id
          JOIN administrators a ON c.school_id = a.school_id
          WHERE u.id = $1 AND a.id = $2
        `, [userId, currentUserId]);

        if (schoolCheck.rows.length === 0) {
          return res.status(403).json({ error: 'You can only reset passwords for students in your school' });
        }
      } else if (currentUserRole !== 'admin') {
        return res.status(403).json({ error: 'Access denied: insufficient permissions' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password
      await db.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, userId]
      );

      // Log the password reset action (for security audit)
      console.log(`Password reset for user ${userId} (${targetUser.email}) by ${currentUserRole} ${currentUserId} at ${new Date().toISOString()}`);

      res.json({ 
        message: 'Password reset successfully',
        user: {
          id: targetUser.id,
          name: `${targetUser.first_name} ${targetUser.last_name}`,
          email: targetUser.email
        }
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

module.exports = router;