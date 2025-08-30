const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');
const { body, validationResult } = require('express-validator');
const { authenticateToken: auth } = require('../middleware/auth');

const rateLimit = require('express-rate-limit');
const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // limit each IP to 10 requests per windowMs
  message: { error: "لقد تجاوزت الحد المسموح لمحاولات التسجيل. حاول لاحقًا." }
});

// Administrator validation rules
const administratorValidationRules = [
  body('id')
    .isLength({ min: 10, max: 10 })
    .withMessage('رقم الهوية يجب أن يكون 10 أرقام')
    .isNumeric()
    .withMessage('رقم الهوية يجب أن يتكون من أرقام فقط'),
  body('first_name').notEmpty().withMessage('يرجى تعبئة الإسم الأول'),
  body('second_name').notEmpty().withMessage('يرجى تعبئة الاسم الثاني'),
  body('third_name').notEmpty().withMessage('يرجى تعبئة اسم الجد'),
  body('last_name').notEmpty().withMessage('يرجى تعبئة اسم العائلة'),
  body('email')
    .isEmail()
    .withMessage('صيغة البريد الإلكتروني غير صحيحة'),
  body('phone')
    .matches(/^05\d{8}$/)
    .withMessage('رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('role')
    .optional()
    .isIn(['administrator', 'assistant_admin', 'coordinator', 'supervisor'])
    .withMessage('الدور الإداري غير صحيح'),
  body('qualifications')
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 })
    .withMessage('المؤهلات يجب أن تكون أقل من 1000 حرف'),
  body('permissions')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('الصلاحيات يجب أن تكون أقل من 2000 حرف')
];

// POST /api/administrators - Register an administrator
router.post('/', auth, registerLimiter, administratorValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const client = await db.connect();
  try {
    const {
      id,
      first_name,
      second_name,
      third_name,
      last_name,
      email,
      phone,
      password,
      address,
      role = 'administrator',
      qualifications,
      permissions,
      salary
    } = req.body;

    await client.query('BEGIN');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table (inactive by default until activated by admin)
    await client.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name, email, 
        phone, password, address, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [id, first_name, second_name, third_name, last_name, email, phone, hashedPassword, address || null, false]);

    // Insert into administrators table
    await client.query(`
      INSERT INTO administrators (
        id, role, qualifications, permissions, salary
      ) VALUES ($1, $2, $3, $4, $5)
    `, [id, role, qualifications || null, permissions || null, salary || null]);

    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: '✅ تم إضافة مدير المجمع بنجاح. سيتم تفعيل الحساب لاحقاً.',
      administratorId: id,
      role: role,
      status: 'pending_activation'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Administrator registration error:', err);

    // Handle specific database errors
    if (err.code === '23505') {
      if (err.detail && err.detail.includes('email')) {
        return res.status(400).json({ error: "البريد الإلكتروني مستخدم من قبل" });
      }
      if (err.detail && err.detail.includes('id')) {
        return res.status(400).json({ error: "رقم الهوية مستخدم من قبل" });
      }
      return res.status(400).json({ error: "يوجد حساب بنفس البيانات" });
    }

    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء حساب المدير' });
  } finally {
    client.release();
  }
});

// GET /api/administrators - Get all administrators
router.get('/', auth, async (req, res) => {
  try {
    const { role, is_active } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    // Add role filtering if provided
    if (role && role !== 'all') {
      whereClause += ` AND a.role = $${params.length + 1}`;
      params.push(role);
    }

    // Add active status filtering if provided
    if (is_active !== undefined && is_active !== 'all') {
      whereClause += ` AND u.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    const query = `
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.address, u.is_active, u.created_at,
        a.role, a.hire_date, a.salary, a.status, a.qualifications, 
        a.permissions, 'administrator' as user_type
      FROM users u
      JOIN administrators a ON u.id = a.id
      ${whereClause}
      ORDER BY u.is_active DESC, u.first_name, u.last_name
    `;

    const result = await db.query(query, params);
    res.json({ administrators: result.rows });

  } catch (err) {
    console.error('Get administrators error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة مديري المجمعات' });
  }
});

// GET /api/administrators/:id - Get administrator details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.address, u.is_active, u.created_at,
        a.role, a.hire_date, a.salary, a.status, a.qualifications,
        a.permissions, 'administrator' as user_type
      FROM users u
      JOIN administrators a ON u.id = a.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'مدير المجمع غير موجود' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Get administrator error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات مدير المجمع' });
  }
});

// PUT /api/administrators/:id - Update administrator information
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      second_name,
      third_name,
      last_name,
      email,
      phone,
      address,
      role,
      salary,
      qualifications,
      permissions
    } = req.body;

    // Basic validation
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة' });
    }
    if (phone && !/^05\d{8}$/.test(phone)) {
      return res.status(400).json({ error: 'رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05' });
    }

    const client = await db.connect();
    await client.query('BEGIN');

    try {
      // Check if administrator exists
      const existingAdmin = await client.query('SELECT id FROM administrators WHERE id = $1', [id]);
      if (existingAdmin.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'مدير المجمع غير موجود' });
      }

      // Update user record
      await client.query(`
        UPDATE users 
        SET first_name = $1, second_name = $2, third_name = $3, last_name = $4,
            email = $5, phone = $6, address = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `, [first_name, second_name, third_name, last_name, email, phone, address || null, id]);

      // Update administrator record
      await client.query(`
        UPDATE administrators 
        SET role = $1, salary = $2, qualifications = $3, permissions = $4
        WHERE id = $5
      `, [role || 'administrator', salary || null, qualifications || null, permissions || null, id]);

      await client.query('COMMIT');
      res.json({ message: 'تم تحديث بيانات مدير المجمع بنجاح', administratorId: id });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating administrator:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'البريد الإلكتروني مستخدم من قبل' });
    } else {
      res.status(500).json({ error: 'حدث خطأ في تحديث بيانات مدير المجمع' });
    }
  }
});

// PATCH /api/administrators/:id/activate - Toggle administrator activation
router.patch('/:id/activate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Check if administrator exists
    const existingAdmin = await db.query('SELECT id FROM administrators WHERE id = $1', [id]);
    if (existingAdmin.rows.length === 0) {
      return res.status(404).json({ error: 'مدير المجمع غير موجود' });
    }

    // Update activation status
    await db.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, id]);
    
    const statusText = is_active ? 'تم تفعيل' : 'تم إلغاء تفعيل';
    res.json({ message: `${statusText} مدير المجمع بنجاح` });

  } catch (error) {
    console.error('Error toggling administrator activation:', error);
    res.status(500).json({ error: 'حدث خطأ في تغيير حالة تفعيل مدير المجمع' });
  }
});

// DELETE /api/administrators/:id - Delete administrator (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const client = await db.connect();
    await client.query('BEGIN');

    try {
      // Check if administrator exists
      const existingAdmin = await client.query('SELECT id FROM administrators WHERE id = $1', [id]);
      if (existingAdmin.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'مدير المجمع غير موجود' });
      }

      // Set administrator status to inactive instead of hard delete
      await client.query('UPDATE administrators SET status = $1 WHERE id = $2', ['inactive', id]);
      
      // Also deactivate the user
      await client.query('UPDATE users SET is_active = false WHERE id = $1', [id]);

      await client.query('COMMIT');
      res.json({ message: 'تم حذف مدير المجمع بنجاح' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error deleting administrator:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف مدير المجمع' });
  }
});

module.exports = router;