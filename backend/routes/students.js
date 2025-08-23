const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');

const rateLimit = require('express-rate-limit');
const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // limit each IP to 10 requests per windowMs
  message: { error: "لقد تجاوزت الحد المسموح لمحاولات التسجيل. حاول لاحقًا." }
});

// Student registration validation rules
const studentValidationRules = [
  body('id')
    .isLength({ min: 10, max: 10 })
    .withMessage('رقم الهوية يجب أن يكون 10 أرقام')
    .isNumeric()
    .withMessage('رقم الهوية يجب أن يتكون من أرقام فقط'),
  body('first_name').notEmpty().withMessage('يرجى تعبئة الإسم الأول'),
  body('second_name').notEmpty().withMessage('يرجى تعبئة الاسم الثاني'),
  body('third_name').notEmpty().withMessage('يرجى تعبئة اسم الجد'),
  body('last_name').notEmpty().withMessage('يرجى تعبئة اسم العائلة'),
  body('school_level').notEmpty().withMessage('يرجى اختيار المرحلة الدراسية'),
  body('date_of_birth')
    .isISO8601()
    .withMessage('تاريخ الميلاد غير صحيح'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^05\d{8}$/)
    .withMessage('رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('صيغة البريد الإلكتروني غير صحيحة'),
  body('parent_id')
    .optional({ checkFalsy: true })
    .isLength({ min: 10, max: 10 })
    .isNumeric()
    .withMessage('رقم هوية ولي الأمر يجب أن يكون 10 أرقام')
];

// POST /api/students - Register a student
router.post('/', registerLimiter, studentValidationRules, async (req, res) => {
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
      school_level,
      date_of_birth,
      password,
      phone,
      email,
      parent_id
    } = req.body;

    await client.query('BEGIN');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table (inactive by default)
    await client.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name, email, 
        phone, password, date_of_birth, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [id, first_name, second_name, third_name, last_name, email || null, phone || null, hashedPassword, date_of_birth, false]);

    // Check if parent exists before setting parent_id
    let validParentId = null;
    if (parent_id) {
      const parentCheck = await client.query(
        'SELECT id FROM parents WHERE id = $1', 
        [parent_id]
      );
      
      if (parentCheck.rows.length > 0) {
        validParentId = parent_id;
      } else {
        console.log(`Parent ID ${parent_id} not found, student registered without parent link`);
      }
    }

    // Insert into students table (status will default to 'inactive')
    await client.query(`
      INSERT INTO students (
        id, school_level, parent_id, status
      ) VALUES ($1, $2, $3, $4)
    `, [id, school_level, validParentId, 'inactive']);

    // If parent exists, create parent-student relationship
    if (validParentId) {
      await client.query(`
        INSERT INTO parent_student_relationships (parent_id, student_id, is_primary)
        VALUES ($1, $2, true)
        ON CONFLICT (parent_id, student_id) DO NOTHING
      `, [validParentId, id]);
    }

    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: '✅ تم تسجيل طلب الطالب بنجاح. سيتم مراجعة طلبك وإشعارك عند تفعيل الحساب.',
      studentId: id,
      linkedToParent: !!validParentId,
      schoolLevel: school_level,
      status: 'pending_activation',
      note: 'الحساب غير مفعل حتى موافقة الإدارة'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Student registration error:', err);

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

    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء حساب الطالب' });
  } finally {
    client.release();
  }
});

// GET /api/students/:id - Get student details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.date_of_birth, u.created_at,
        s.school_level, s.status, s.enrollment_date, s.notes,
        s.parent_id
      FROM users u
      JOIN students s ON u.id = s.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    const student = result.rows[0];
    
    // Get linked parents
    const parentsResult = await db.query(`
      SELECT 
        p.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, psr.relationship_type, psr.is_primary
      FROM parent_student_relationships psr
      JOIN parents p ON psr.parent_id = p.id
      JOIN users u ON p.id = u.id
      WHERE psr.student_id = $1
      ORDER BY psr.is_primary DESC, u.first_name
    `, [id]);

    // Get current class enrollments
    const enrollmentsResult = await db.query(`
      SELECT 
        c.id as class_id, c.name as class_name, c.room_number,
        se.enrollment_date, se.status, se.final_grade,
        u.first_name || ' ' || u.last_name as teacher_name
      FROM student_enrollments se
      JOIN classes c ON se.class_id = c.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.id = u.id
      WHERE se.student_id = $1 AND se.status = 'enrolled'
      ORDER BY se.enrollment_date DESC
    `, [id]);

    res.json({
      student,
      parents: parentsResult.rows,
      current_classes: enrollmentsResult.rows
    });

  } catch (err) {
    console.error('Get student error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الطالب' });
  }
});

// GET /api/students - Get all students (with filters)
router.get('/', async (req, res) => {
  try {
    const { school_level, status = 'active', parent_id, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        s.school_level, s.status, s.enrollment_date,
        COUNT(se.id) as active_enrollments
      FROM users u
      JOIN students s ON u.id = s.id
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'enrolled'
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (school_level) {
      query += ` AND s.school_level = $${paramIndex}`;
      params.push(school_level);
      paramIndex++;
    }

    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (parent_id) {
      query += ` AND s.parent_id = $${paramIndex}`;
      params.push(parent_id);
      paramIndex++;
    }

    query += `
      GROUP BY u.id, u.first_name, u.second_name, u.third_name, u.last_name,
               s.school_level, s.status, s.enrollment_date
      ORDER BY u.first_name, u.last_name
    `;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      JOIN students s ON u.id = s.id
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamIndex = 1;

    if (school_level) {
      countQuery += ` AND s.school_level = $${countParamIndex}`;
      countParams.push(school_level);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND s.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (parent_id) {
      countQuery += ` AND s.parent_id = $${countParamIndex}`;
      countParams.push(parent_id);
      countParamIndex++;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      students: result.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_students: total,
        per_page: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الطلاب' });
  }
});

// PUT /api/students/:id - Update student information
router.put('/:id', [
  body('school_level').optional({ checkFalsy: true }).notEmpty().withMessage('المرحلة الدراسية مطلوبة'),
  body('phone').optional({ checkFalsy: true }).matches(/^05\d{8}$/).withMessage('رقم الجوال غير صحيح'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  body('status').optional({ checkFalsy: true }).isIn(['active', 'graduated', 'suspended', 'withdrawn']).withMessage('حالة الطالب غير صحيحة')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const client = await db.connect();
  try {
    const { id } = req.params;
    const { school_level, phone, email, status, notes } = req.body;

    await client.query('BEGIN');

    // Check if student exists
    const studentCheck = await client.query('SELECT id FROM students WHERE id = $1', [id]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    // Update users table
    const userUpdates = [];
    const userParams = [];
    let userParamIndex = 1;

    if (phone !== undefined) {
      userUpdates.push(`phone = $${userParamIndex}`);
      userParams.push(phone || null);
      userParamIndex++;
    }

    if (email !== undefined) {
      userUpdates.push(`email = $${userParamIndex}`);
      userParams.push(email || null);
      userParamIndex++;
    }

    if (userUpdates.length > 0) {
      userParams.push(id);
      const userQuery = `UPDATE users SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${userParamIndex}`;
      await client.query(userQuery, userParams);
    }

    // Update students table
    const studentUpdates = [];
    const studentParams = [];
    let studentParamIndex = 1;

    if (school_level !== undefined) {
      studentUpdates.push(`school_level = $${studentParamIndex}`);
      studentParams.push(school_level);
      studentParamIndex++;
    }

    if (status !== undefined) {
      studentUpdates.push(`status = $${studentParamIndex}`);
      studentParams.push(status);
      studentParamIndex++;
    }

    if (notes !== undefined) {
      studentUpdates.push(`notes = $${studentParamIndex}`);
      studentParams.push(notes);
      studentParamIndex++;
    }

    if (studentUpdates.length > 0) {
      studentParams.push(id);
      const studentQuery = `UPDATE students SET ${studentUpdates.join(', ')} WHERE id = $${studentParamIndex}`;
      await client.query(studentQuery, studentParams);
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: '✅ تم تحديث بيانات الطالب بنجاح',
      studentId: id
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update student error:', err);
    
    if (err.code === '23505') {
      if (err.detail && err.detail.includes('email')) {
        return res.status(400).json({ error: "البريد الإلكتروني مستخدم من قبل" });
      }
    }
    
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات الطالب' });
  } finally {
    client.release();
  }
});

// GET /api/students/:id/attendance - Get student attendance
router.get('/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const { from_date, to_date, class_id } = req.query;
    
    let query = `
      SELECT 
        a.date, a.status, a.notes,
        c.name as class_name, c.room_number
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      WHERE a.student_id = $1
    `;
    
    const params = [id];
    let paramIndex = 2;

    if (from_date) {
      query += ` AND a.date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      query += ` AND a.date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    if (class_id) {
      query += ` AND a.class_id = $${paramIndex}`;
      params.push(class_id);
      paramIndex++;
    }

    query += ` ORDER BY a.date DESC, c.name`;

    const result = await db.query(query, params);
    
    res.json({
      student_id: id,
      attendance_records: result.rows
    });

  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل الحضور' });
  }
});

module.exports = router;