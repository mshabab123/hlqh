const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');

// Import authentication middleware
const { authenticateToken: requireAuth } = require('../middleware/auth');

const requireAdmin = (req, res, next) => {
  // TODO: Check if user has admin role
  // For now, we'll assume the user is an admin
  next();
};

// School validation rules
const schoolValidationRules = [
  body('name').notEmpty().withMessage('اسم مجمع الحلقات مطلوب'),
  body('address').notEmpty().withMessage('العنوان مطلوب'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^05\d{8}$/)
    .withMessage('رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 05'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('صيغة البريد الإلكتروني غير صحيحة'),
  body('established_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('تاريخ التأسيس غير صحيح'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('حالة التفعيل يجب أن تكون صحيح أو خطأ')
];

// GET /api/schools - Get all schools
router.get('/', requireAuth, async (req, res) => {
  try {
    console.log('GET /schools called');
    const result = await db.query(`
      SELECT 
        s.id, s.name, s.address, s.phone, s.email, s.established_date, s.is_active, s.created_at
      FROM schools s
      ORDER BY s.created_at DESC
    `);
    console.log('Schools found:', result.rows.length);

    res.json(result.rows);
  } catch (err) {
    console.error('Get schools error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب مجمع الحلقات' });
  }
});

// POST /api/schools - Create new school
router.post('/', requireAuth, requireAdmin, schoolValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const client = await db.connect();
  try {
    const {
      name,
      address,
      phone,
      email,
      established_date,
      is_active = true
    } = req.body;

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO schools (
        name, address, phone, email, established_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [name, address, phone || null, email || null, established_date || null, is_active]);

    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: '✅ تم إنشاء مجمع الحلقات بنجاح',
      schoolId: result.rows[0].id
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create school error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء مجمع الحلقات' });
  } finally {
    client.release();
  }
});

// PUT /api/schools/:id - Update school
router.put('/:id', requireAuth, requireAdmin, schoolValidationRules, async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const {
      name,
      address,
      phone,
      email,
      established_date,
      is_active
    } = req.body;

    await client.query('BEGIN');

    await client.query(`
      UPDATE schools SET 
        name = $1, 
        address = $2, 
        phone = $3, 
        email = $4, 
        established_date = $5, 
        is_active = $6
      WHERE id = $7
    `, [name, address, phone || null, email || null, established_date || null, is_active, id]);

    await client.query('COMMIT');
    
    res.json({ 
      message: '✅ تم تحديث مجمع الحلقات بنجاح',
      schoolId: id
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update school error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث مجمع الحلقات' });
  } finally {
    client.release();
  }
});

module.exports = router;