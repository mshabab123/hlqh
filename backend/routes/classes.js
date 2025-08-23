const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  // TODO: Implement proper authentication middleware
  next();
};

// Class validation rules
const classValidationRules = [
  body('name').notEmpty().withMessage('اسم الحلقة مطلوب'),
  body('school_id').isUUID().withMessage('معرف مجمع الحلقات مطلوب'),
  body('teacher_id')
    .optional({ checkFalsy: true })
    .isLength({ min: 10, max: 10 })
    .withMessage('معرف المعلم يجب أن يكون 10 أرقام'),
  body('max_students')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('الحد الأقصى للطلاب يجب أن يكون بين 1 و 50')
];

// GET /api/classes - Get all classes with enhanced information (using current schema)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { school_id, is_active } = req.query;
    
    let query = `
      SELECT 
        c.id, c.name, c.max_students, c.room_number as teacher_id,
        c.is_active, c.created_at, c.school_id,
        s.name as school_name,
        CASE WHEN u.id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name) ELSE NULL END as teacher_name
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.id
      LEFT JOIN users u ON c.room_number = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (school_id) {
      query += ` AND c.school_id = $${paramIndex}`;
      params.push(school_id);
      paramIndex++;
    }

    if (is_active !== undefined) {
      query += ` AND c.is_active = $${paramIndex}`;
      params.push(is_active);
      paramIndex++;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await db.query(query, params);
    res.json({ classes: result.rows });
  } catch (err) {
    console.error('Get classes error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الحلقات' });
  }
});

// GET /api/classes/:id - Get class details (using current schema)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        c.id, c.name, c.school_id, c.max_students, c.room_number as teacher_id,
        c.is_active, c.created_at,
        s.name as school_name,
        CASE WHEN u.id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name) ELSE NULL END as teacher_name
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.id
      LEFT JOIN users u ON c.room_number = u.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get class error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الحلقة' });
  }
});

// POST /api/classes - Create new class
router.post('/', requireAuth, classValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const client = await db.connect();
  try {
    const {
      name,
      school_id,
      teacher_id,
      max_students = 20,
      is_active = true
    } = req.body;

    await client.query('BEGIN');

    // Check if school exists
    const schoolCheck = await client.query('SELECT id FROM schools WHERE id = $1', [school_id]);
    if (schoolCheck.rows.length === 0) {
      return res.status(400).json({ error: 'مجمع الحلقات المحدد غير موجود' });
    }

    // Check if teacher exists if provided
    if (teacher_id) {
      const teacherCheck = await client.query('SELECT id FROM users WHERE id = $1', [teacher_id]);
      if (teacherCheck.rows.length === 0) {
        return res.status(400).json({ error: 'المعلم المحدد غير موجود' });
      }
    }

    const result = await client.query(`
      INSERT INTO classes (
        name, school_id, school_level, max_students, room_number, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [name, school_id, 'عام', max_students, teacher_id || null, is_active]);

    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: '✅ تم إنشاء الحلقة بنجاح',
      classId: result.rows[0].id
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create class error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحلقة' });
  } finally {
    client.release();
  }
});

// PUT /api/classes/:id - Update class
router.put('/:id', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const {
      name,
      school_id,
      teacher_id,
      max_students,
      is_active
    } = req.body;

    await client.query('BEGIN');

    // Check if class exists
    const classCheck = await client.query('SELECT id FROM classes WHERE id = $1', [id]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }

    // Check if teacher exists if provided
    if (teacher_id) {
      const teacherCheck = await client.query('SELECT id FROM users WHERE id = $1', [teacher_id]);
      if (teacherCheck.rows.length === 0) {
        return res.status(400).json({ error: 'المعلم المحدد غير موجود' });
      }
    }

    await client.query(`
      UPDATE classes SET 
        name = COALESCE($1, name),
        school_id = COALESCE($2, school_id),
        school_level = 'عام',
        max_students = COALESCE($3, max_students),
        room_number = $4,
        is_active = COALESCE($5, is_active)
      WHERE id = $6
    `, [name, school_id, max_students, teacher_id || null, is_active, id]);

    await client.query('COMMIT');
    
    res.json({ 
      message: '✅ تم تحديث الحلقة بنجاح',
      classId: id
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update class error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الحلقة' });
  } finally {
    client.release();
  }
});

// DELETE /api/classes/:id - Delete class
router.delete('/:id', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');
    
    // Check if class has any students enrolled
    const enrollmentCheck = await client.query(
      'SELECT COUNT(*) as count FROM student_enrollments WHERE class_id = $1 AND status = $2',
      [id, 'enrolled']
    );
    
    if (parseInt(enrollmentCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'لا يمكن حذف الحلقة لأنها تحتوي على طلاب مسجلين' 
      });
    }

    const result = await client.query(`
      DELETE FROM classes WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }

    await client.query('COMMIT');
    res.json({ message: '✅ تم حذف الحلقة بنجاح' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete class error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الحلقة' });
  } finally {
    client.release();
  }
});

module.exports = router;