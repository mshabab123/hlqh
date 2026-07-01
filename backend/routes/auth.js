const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/database');
const {
  hashToken,
  TOKEN_TTL,
  TOKEN_TTL_MS,
  LOGIN_MAX_ATTEMPTS,
  LOCKOUT_MINUTES,
} = require('../config/security');
const { authenticateToken } = require('../middleware/auth');
const { authCookieOptions, csrfCookieOptions } = require('../utils/cookies');

// JWT_SECRET must be set in environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}
const JWT_SECRET = process.env.JWT_SECRET;

function setAuthCookies(res, token) {
  res.cookie('auth_token', token, {
    ...authCookieOptions(),
    maxAge: TOKEN_TTL_MS,
  });
  res.cookie('csrf_token', crypto.randomBytes(32).toString('hex'), {
    ...csrfCookieOptions(),
    maxAge: TOKEN_TTL_MS,
  });
}

function clearAuthCookies(res) {
  res.clearCookie('auth_token', authCookieOptions());
  res.clearCookie('csrf_token', csrfCookieOptions());
}

// Throttle login attempts to slow down credential brute-forcing.
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز عدد محاولات تسجيل الدخول المسموح بها. حاول مرة أخرى بعد قليل.' }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { id, password } = req.body;

  try {
    // 1. Find user by id and determine their role(s)
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.password, u.is_active,
        u.failed_login_attempts, u.lockout_until,
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
        s.school_level
      FROM users u
      LEFT JOIN parents p ON u.id = p.id
      LEFT JOIN students s ON u.id = s.id
      LEFT JOIN teachers t ON u.id = t.id
      LEFT JOIN admins a ON u.id = a.id
      LEFT JOIN administrators ad ON u.id = ad.id
      LEFT JOIN supervisors sv ON u.id = sv.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' });
    }
    const user = result.rows[0];

    // 1b. Enforce per-account lockout to slow targeted brute-forcing.
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
      return res.status(429).json({
        error: `تم قفل الحساب مؤقتاً بسبب محاولات دخول خاطئة متكررة. حاول مرة أخرى بعد ${minutesLeft} دقيقة.`
      });
    }

    // 2. Check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Increment failed attempts and lock the account once the threshold is hit.
      const attempts = (user.failed_login_attempts || 0) + 1;
      if (attempts >= LOGIN_MAX_ATTEMPTS) {
        await db.query(
          'UPDATE users SET failed_login_attempts = 0, lockout_until = $1 WHERE id = $2',
          [new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000), user.id]
        );
      } else {
        await db.query(
          'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
          [attempts, user.id]
        );
      }
      return res.status(401).json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' });
    }

    // Successful password check — clear any failed-attempt / lockout state.
    if (user.failed_login_attempts > 0 || user.lockout_until) {
      await db.query(
        'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = $1',
        [user.id]
      );
    }

    // 3. Check if user is inactive and inform them
    if (!user.is_active) {
      // Still allow login but with limited access and warning message
      const inactivePayload = {
        id: user.id,
        role: user.role,
        user_type: user.role,
        first_name: user.first_name,
        second_name: user.second_name,
        third_name: user.third_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        is_active: false,
        account_status: 'pending_activation'
      };

      const token = jwt.sign(inactivePayload, JWT_SECRET, { expiresIn: TOKEN_TTL });

      // Create session record
      await db.query(`
        INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, expires_at, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
      `, [
        id,
        hashToken(token),
        req.headers['user-agent'] || 'Unknown',
        req.ip || req.connection.remoteAddress,
        new Date(Date.now() + TOKEN_TTL_MS)
      ]);

      setAuthCookies(res, token);

      return res.json({
        message: '⚠️ تم تسجيل الدخول بنجاح، لكن حسابك غير مفعل بعد',
        user: inactivePayload,
        warning: 'حسابك قيد المراجعة من الإدارة. سيتم إشعارك عند تفعيل الحساب.',
        account_status: 'pending_activation',
        limited_access: true
      });
    }

    // 4. Get additional role-specific data (only for active users)
    let additionalData = {};

    if (user.role === 'parent' || user.role === 'parent_student') {
      // Get children for parents
      const childrenResult = await db.query(`
        SELECT
          s.id, u.first_name, u.last_name, s.school_level
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

    if (user.role === 'administrator' || user.role === 'supervisor') {
      // Report the user's actual assigned school. Administrators/supervisors are
      // scoped to a single school; if they have been removed from one, they are
      // connected to no school and cannot access any school-scoped data.
      const scopeTable = user.role === 'administrator' ? 'administrators' : 'supervisors';
      const schoolResult = await db.query(`
        SELECT s.id, s.name
        FROM ${scopeTable} scoped
        JOIN schools s ON scoped.school_id = s.id
        WHERE scoped.id = $1
      `, [id]);
      if (schoolResult.rows.length > 0) {
        additionalData.assigned_school = schoolResult.rows[0];
        additionalData.no_school_assigned = false;
      } else {
        additionalData.assigned_school = null;
        additionalData.no_school_assigned = true;
      }
    }

    // 5. Create JWT payload (do NOT put password!) - for active users
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
      is_active: true,
      account_status: 'active',
      ...additionalData
    };

    // 6. Sign JWT (TOKEN_TTL, default 1 day)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });

    // 7. Create session record for security
    await db.query(`
      INSERT INTO user_sessions (user_id, token_hash, device_info, ip_address, expires_at, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
    `, [
      id,
      hashToken(token),
      req.headers['user-agent'] || 'Unknown',
      req.ip || req.connection.remoteAddress,
      new Date(Date.now() + TOKEN_TTL_MS)
    ]);

    setAuthCookies(res, token);

    // 8. Respond with JWT
    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      user: payload,
      account_status: 'active'
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// POST /api/auth/logout - Revoke the current session's token
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE user_sessions SET is_active = false WHERE token_hash = $1',
      [hashToken(req.token)]
    );
    clearAuthCookies(res);
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الخروج' });
  }
});

// POST /api/auth/logout-all - Revoke every active session for the current user
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND is_active = true',
      [req.user.id]
    );
    clearAuthCookies(res);
    res.json({ message: 'تم تسجيل الخروج من جميع الأجهزة' });
  } catch (err) {
    console.error('Logout-all error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الخروج' });
  }
});

module.exports = router;
