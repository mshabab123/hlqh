const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get user privileges
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user role
    const userQuery = `
      SELECT 
        u.id, 
        CONCAT(u.first_name, ' ', u.second_name, ' ', u.third_name, ' ', u.last_name) as name,
        u.email,
        CASE 
          WHEN a.id IS NOT NULL THEN 'admin'
          WHEN ad.id IS NOT NULL THEN 'administrator' 
          WHEN s.id IS NOT NULL THEN 'supervisor'
          WHEN t.id IS NOT NULL THEN 'teacher'
          WHEN p.id IS NOT NULL THEN 'parent'
          WHEN st.id IS NOT NULL THEN 'student'
          ELSE 'unknown'
        END as role
      FROM users u
      LEFT JOIN admins a ON u.id = a.id
      LEFT JOIN administrators ad ON u.id = ad.id
      LEFT JOIN supervisors s ON u.id = s.id
      LEFT JOIN teachers t ON u.id = t.id
      LEFT JOIN parents p ON u.id = p.id
      LEFT JOIN students st ON u.id = st.id
      WHERE u.id = $1
    `;

    const userResult = await db.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get custom privileges
    const privilegesQuery = `
      SELECT permissions 
      FROM user_privileges 
      WHERE user_id = $1
    `;
    
    const privilegesResult = await db.query(privilegesQuery, [userId]);
    let permissions = {};
    
    if (privilegesResult.rows.length > 0) {
      permissions = privilegesResult.rows[0].permissions;
    }

    res.json({
      user,
      permissions
    });

  } catch (error) {
    console.error('Error fetching user privileges:', error);
    res.status(500).json({ error: 'Failed to fetch privileges' });
  }
});

// Update user privileges
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Upsert privileges
    const upsertQuery = `
      INSERT INTO user_privileges (user_id, permissions, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET permissions = $2, updated_at = NOW()
      RETURNING *
    `;

    const result = await db.query(upsertQuery, [userId, JSON.stringify(permissions)]);

    res.json({
      message: 'Privileges updated successfully',
      privileges: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating user privileges:', error);
    res.status(500).json({ error: 'Failed to update privileges' });
  }
});

// Get all users with their roles and privileges
router.get('/', async (req, res) => {
  try {
    const { role, search } = req.query;

    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (role && role !== 'all') {
      paramCount++;
      whereClause += ` AND CASE 
        WHEN a.id IS NOT NULL THEN 'admin'
        WHEN ad.id IS NOT NULL THEN 'administrator' 
        WHEN s.id IS NOT NULL THEN 'supervisor'
        WHEN t.id IS NOT NULL THEN 'teacher'
        WHEN p.id IS NOT NULL THEN 'parent'
        WHEN st.id IS NOT NULL THEN 'student'
        ELSE 'unknown'
      END = $${paramCount}`;
      params.push(role);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (CONCAT(u.first_name, ' ', u.second_name, ' ', u.third_name, ' ', u.last_name) ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const query = `
      SELECT 
        u.id, 
        CONCAT(u.first_name, ' ', u.second_name, ' ', u.third_name, ' ', u.last_name) as name,
        u.email, u.created_at,
        CASE 
          WHEN a.id IS NOT NULL THEN 'admin'
          WHEN ad.id IS NOT NULL THEN 'administrator' 
          WHEN s.id IS NOT NULL THEN 'supervisor'
          WHEN t.id IS NOT NULL THEN 'teacher'
          WHEN p.id IS NOT NULL THEN 'parent'
          WHEN st.id IS NOT NULL THEN 'student'
          ELSE 'unknown'
        END as role,
        up.permissions
      FROM users u
      LEFT JOIN admins a ON u.id = a.id
      LEFT JOIN administrators ad ON u.id = ad.id
      LEFT JOIN supervisors s ON u.id = s.id
      LEFT JOIN teachers t ON u.id = t.id
      LEFT JOIN parents p ON u.id = p.id
      LEFT JOIN students st ON u.id = st.id
      LEFT JOIN user_privileges up ON u.id = up.user_id
      WHERE 1=1 ${whereClause}
      ORDER BY name
    `;

    const result = await db.query(query, params);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching users with privileges:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;