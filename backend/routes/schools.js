const express = require('express');
const router = express.Router();
const db = require('../config/database');
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

// GET /api/schools/public - Get all active schools (public endpoint for registration)
router.get('/public', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.id, s.name
      FROM schools s
      WHERE s.is_active = true
      ORDER BY s.name
    `);

    res.json({ schools: result.rows });
  } catch (err) {
    console.error('Get public schools error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب مجمع الحلقات' });
  }
});

// GET /api/schools - Get all schools (protected endpoint for management)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.id, 
        s.name, 
        s.address, 
        s.phone, 
        s.email, 
        s.is_active, 
        s.created_at,
        s.administrator_id,
        u.first_name as administrator_first_name,
        u.second_name as administrator_second_name,
        u.third_name as administrator_third_name,
        u.last_name as administrator_last_name,
        u.email as administrator_email,
        u.phone as administrator_phone
      FROM schools s
      LEFT JOIN administrators a ON s.administrator_id = a.id
      LEFT JOIN users u ON a.id = u.id
      ORDER BY s.created_at DESC
    `);

    res.json({ schools: result.rows });
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
      is_active = true,
      administrator_id
    } = req.body;

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO schools (
        name, address, phone, email, established_date, is_active, administrator_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [name, address, phone || null, email || null, established_date || null, is_active, administrator_id || null]);

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
      is_active,
      administrator_id
    } = req.body;

    await client.query('BEGIN');

    await client.query(`
      UPDATE schools SET 
        name = $1, 
        address = $2, 
        phone = $3, 
        email = $4, 
        established_date = $5, 
        is_active = $6,
        administrator_id = $7
      WHERE id = $8
    `, [name, address, phone || null, email || null, established_date || null, is_active, administrator_id || null, id]);

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

// DELETE /api/schools/:id - Delete school (soft delete or cascade delete)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { force = false } = req.query; // Add force parameter for cascade delete

    await client.query('BEGIN');

    // Check if school exists
    const schoolCheck = await client.query('SELECT id, name FROM schools WHERE id = $1', [id]);
    if (schoolCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'مجمع الحلقات غير موجود' });
    }

    // Check if school has active classes
    const classesCheck = await client.query('SELECT COUNT(*) as count FROM classes WHERE school_id = $1', [id]);
    if (classesCheck.rows[0].count > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'لا يمكن حذف مجمع الحلقات لوجود حلقات مرتبطة به. يجب حذف الحلقات أولاً أو نقلها إلى مجمع آخر' 
      });
    }

    // Check if school has semesters
    const semestersCheck = await client.query('SELECT COUNT(*) as count FROM semesters WHERE school_id = $1', [id]);
    if (semestersCheck.rows[0].count > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'لا يمكن حذف مجمع الحلقات لوجود فصول دراسية مرتبطة به. يجب حذف الفصول الدراسية أولاً' 
      });
    }

    // Check if school has semester courses
    const semesterCoursesCheck = await client.query('SELECT COUNT(*) as count FROM semester_courses WHERE school_id = $1', [id]);
    if (semesterCoursesCheck.rows[0].count > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'لا يمكن حذف مجمع الحلقات لوجود مقررات دراسية مرتبطة به. يجب حذف المقررات أولاً' 
      });
    }

    // Check if school has daily reports
    const dailyReportsCheck = await client.query('SELECT COUNT(*) as count FROM daily_reports WHERE school_id = $1', [id]);
    if (dailyReportsCheck.rows[0].count > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'لا يمكن حذف مجمع الحلقات لوجود تقارير يومية مرتبطة به' 
      });
    }

    if (force === 'true') {
      // Force delete - remove all dependent records first
      
      // Delete in reverse order of dependencies
      await client.query('DELETE FROM daily_reports WHERE school_id = $1', [id]);
      await client.query('DELETE FROM semester_courses WHERE school_id = $1', [id]);
      await client.query('DELETE FROM classes WHERE school_id = $1', [id]);
      await client.query('DELETE FROM semesters WHERE school_id = $1', [id]);
      
      // Update references in other tables to NULL
      await client.query('UPDATE administrators SET school_id = NULL WHERE school_id = $1', [id]);
      await client.query('UPDATE supervisors SET school_id = NULL WHERE school_id = $1', [id]);
      await client.query('UPDATE teachers SET school_id = NULL WHERE school_id = $1', [id]);
      
      // Finally delete the school
      await client.query('DELETE FROM schools WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      res.json({ 
        message: '✅ تم حذف مجمع الحلقات وجميع البيانات المرتبطة به نهائياً',
        schoolId: id,
        deleted: true
      });
    } else {
      // Soft delete - set is_active to false instead of hard delete
      await client.query(`
        UPDATE schools SET 
          is_active = false,
          name = name || ' (محذوف)'
        WHERE id = $1
      `, [id]);
      
      await client.query('COMMIT');
      
      res.json({ 
        message: '✅ تم إلغاء تفعيل مجمع الحلقات',
        schoolId: id,
        deactivated: true
      });
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete school error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف مجمع الحلقات' });
  } finally {
    client.release();
  }
});

module.exports = router;