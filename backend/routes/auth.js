const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');

// Use a strong secret key! Store in env in production
const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_jwt_key';

router.post('/login', async (req, res) => {
  const { id, password } = req.body;

  try {
    // 1. Find user by id and determine their role(s)
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name, 
        u.email, u.phone, u.password, u.is_active,
        CASE 
          WHEN p.id IS NOT NULL AND s.id IS NOT NULL THEN 'parent_student'
          WHEN p.id IS NOT NULL THEN 'parent'
          WHEN s.id IS NOT NULL THEN 'student'
          WHEN a.id IS NOT NULL THEN 'admin'
          WHEN ad.id IS NOT NULL THEN 'administrator'
          WHEN sv.id IS NOT NULL THEN 'supervisor'
          WHEN t.id IS NOT NULL THEN 'teacher'
          ELSE 'user'
        END as role,
        p.is_also_student,
        s.school_level,
        s.status as student_status
      FROM users u
      LEFT JOIN parents p ON u.id = p.id
      LEFT JOIN students s ON u.id = s.id
      LEFT JOIN teachers t ON u.id = t.id
      LEFT JOIN admins a ON u.id = a.id
      LEFT JOIN administrators ad ON u.id = ad.id
      LEFT JOIN supervisors sv ON u.id = sv.id
      WHERE u.id = $1 AND u.is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' });
    }
    const user = result.rows[0];

    // 2. Check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' });
    }

    // 3. Get additional role-specific data
    let additionalData = {};

    if (user.role === 'parent' || user.role === 'parent_student') {
      // Get children for parents
      const childrenResult = await db.query(`
        SELECT 
          s.id, u.first_name, u.last_name, s.school_level, s.status
        FROM parent_student_relationships psr
        JOIN students s ON psr.student_id = s.id
        JOIN users u ON s.id = u.id
        WHERE psr.parent_id = $1
        ORDER BY u.first_name
      `, [id]);
      additionalData.children = childrenResult.rows;
    }

    if (user.role === 'student' || user.role === 'parent_student') {
      // Get current classes for students
      const classesResult = await db.query(`
        SELECT 
          c.id, c.name, c.room_number, se.status
        FROM student_enrollments se
        JOIN classes c ON se.class_id = c.id
        WHERE se.student_id = $1 AND se.status = 'enrolled'
      `, [id]);
      additionalData.classes = classesResult.rows;
    }

    if (user.role === 'administrator') {
      // Get assigned school for administrators
      const schoolResult = await db.query(`
        SELECT s.id, s.name 
        FROM schools s
        JOIN administrators ad ON s.administrator_id = ad.id
        WHERE ad.id = $1
      `, [id]);
      if (schoolResult.rows.length > 0) {
        additionalData.assigned_school = schoolResult.rows[0];
      }
    }

    // 4. Create JWT payload (do NOT put password!)
    const payload = {
      id: user.id,
      role: user.role,
      user_type: user.role, // Add user_type for compatibility
      first_name: user.first_name,
      second_name: user.second_name,
      third_name: user.third_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      school_level: user.school_level,
      is_also_student: user.is_also_student,
      ...additionalData
    };

    // 5. Sign JWT (1 day expiry)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    // 6. Create session record for security
    await db.query(`
      INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      id,
      require('crypto').createHash('sha256').update(token).digest('hex'),
      req.headers['user-agent'] || 'Unknown',
      req.ip || req.connection.remoteAddress,
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    ]);

    // 7. Respond with JWT
    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: payload,
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

module.exports = router;
