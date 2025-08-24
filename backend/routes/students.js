const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');
const { authenticateToken: auth } = require('../middleware/auth');

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

// GET /api/students - Get all students (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { school_level, status, parent_id, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.address, u.date_of_birth, u.is_active,
        s.school_level, s.status, s.enrollment_date, s.graduation_date, s.notes,
        sc.name as school_name, sc.id as school_id,
        c.name as class_name, c.id as class_id
      FROM users u
      JOIN students s ON u.id = s.id
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'enrolled'
      LEFT JOIN classes c ON se.class_id = c.id
      LEFT JOIN schools sc ON c.school_id = sc.id
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
      ORDER BY u.first_name, u.last_name
    `;

    const result = await db.query(query, params);

    res.json(result.rows);

  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الطلاب' });
  }
});

// GET /api/students/:id - Get student details
router.get('/:id', auth, async (req, res) => {
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

// POST /api/students/manage - Create new student for management (different from registration)
router.post('/manage', (req, res, next) => {
  console.log('POST /manage called with body:', req.body);
  next();
}, auth, [
  body('id')
    .isLength({ min: 10, max: 10 })
    .withMessage('رقم الهوية يجب أن يكون 10 أرقام')
    .isNumeric()
    .withMessage('رقم الهوية يجب أن يتكون من أرقام فقط'),
  body('first_name').notEmpty().withMessage('يرجى تعبئة الإسم الأول'),
  body('second_name').notEmpty().withMessage('يرجى تعبئة الاسم الثاني'),
  body('third_name').notEmpty().withMessage('يرجى تعبئة اسم الجد'),
  body('last_name').notEmpty().withMessage('يرجى تعبئة اسم العائلة'),
  body('school_level').notEmpty().withMessage('يرجى تحديد المستوى الدراسي'),
  body('email').optional().isEmail().withMessage('صيغة البريد الإلكتروني غير صحيحة'),
  body('phone').optional().matches('^05[0-9]{8}$').withMessage('رقم الهاتف يجب أن يبدأ ب 05 ويتكون من 10 أرقام')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'بيانات غير صحيحة',
        details: errors.array().map(err => err.msg)
      });
    }

    const {
      id, first_name, second_name, third_name, last_name,
      email, phone, address, date_of_birth, school_level,
      class_id, notes, status = 'active'
    } = req.body;

    const client = await db.connect();
    await client.query('BEGIN');

    try {
      // Check if user already exists
      const existingUser = await client.query('SELECT id FROM users WHERE id = $1', [id]);
      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'رقم الهوية مستخدم من قبل' });
      }

      // Create user record with default password
      const hashedPassword = await bcrypt.hash('123456', 10);
      const userQuery = `
        INSERT INTO users (id, first_name, second_name, third_name, last_name, email, phone, address, date_of_birth, password, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;
      
      await client.query(userQuery, [
        id, first_name, second_name, third_name, last_name,
        email || null, phone || null, address || null, date_of_birth || null, hashedPassword, true
      ]);

      // Create student record
      const studentQuery = `
        INSERT INTO students (id, school_level, status, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      await client.query(studentQuery, [id, school_level, status, notes || null]);

      // Add student to class if class_id provided
      if (class_id) {
        const enrollmentQuery = `
          INSERT INTO student_enrollments (student_id, class_id, status)
          VALUES ($1, $2, 'enrolled')
          ON CONFLICT (student_id, class_id) DO NOTHING
        `;
        await client.query(enrollmentQuery, [id, class_id]);
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'تم إضافة الطالب بنجاح', studentId: id });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating student:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'رقم الهوية أو البريد الإلكتروني مستخدم من قبل' });
    } else {
      res.status(500).json({ error: 'حدث خطأ في إنشاء الطالب' });
    }
  }
});

// PUT /api/students/:id - Update student information
router.put('/:id', (req, res, next) => {
  console.log('PUT /students/:id called for ID:', req.params.id);
  console.log('Request body:', req.body);
  next();
}, auth, async (req, res) => {
  try {
    // Basic validation for required fields if they are provided
    if (req.body.email && req.body.email.trim() && !/\S+@\S+\.\S+/.test(req.body.email)) {
      return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة' });
    }
    if (req.body.phone && req.body.phone.trim() && !/^05\d{8}$/.test(req.body.phone)) {
      return res.status(400).json({ error: 'رقم الهاتف يجب أن يبدأ ب 05 ويتكون من 10 أرقام' });
    }

    const { id } = req.params;
    
    // Check if trying to activate student without school assignment
    if (req.body.status === 'active') {
      // Get current student data to check school assignment
      const studentCheck = await db.query(`
        SELECT s.id, se.class_id, c.school_id 
        FROM students s
        LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'enrolled'
        LEFT JOIN classes c ON se.class_id = c.id
        WHERE s.id = $1
      `, [id]);

      if (studentCheck.rows.length > 0) {
        const studentData = studentCheck.rows[0];
        if (!studentData.school_id) {
          return res.status(400).json({ 
            error: 'لا يمكن تفعيل الطالب بدون تعيينه إلى مدرسة. يرجى تحديد المدرسة أولاً.' 
          });
        }
      }
    }
    
    const {
      first_name, second_name, third_name, last_name,
      email, phone, address, date_of_birth, school_level,
      class_id, notes, status
    } = req.body;

    const client = await db.connect();
    await client.query('BEGIN');

    try {
      // Check if student exists
      const existingStudent = await client.query('SELECT id FROM students WHERE id = $1', [id]);
      if (existingStudent.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'الطالب غير موجود' });
      }

      // Update user record (including is_active based on status)
      const userQuery = `
        UPDATE users 
        SET first_name = $1, second_name = $2, third_name = $3, last_name = $4,
            email = $5, phone = $6, address = $7, date_of_birth = $8, 
            is_active = $9, updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
      `;
      
      const isActive = status === 'active';
      await client.query(userQuery, [
        first_name, second_name, third_name, last_name,
        email || null, phone || null, address || null, date_of_birth || null, 
        isActive, id
      ]);

      // Update student record
      const studentQuery = `
        UPDATE students 
        SET school_level = $1, status = $2, notes = $3
        WHERE id = $4
      `;
      
      await client.query(studentQuery, [school_level, status, notes || null, id]);

      // Handle class assignment changes
      if (class_id !== undefined) {
        // Remove student from current class
        await client.query('DELETE FROM student_enrollments WHERE student_id = $1 AND status = $2', [id, 'enrolled']);

        // Add to new class if provided
        if (class_id) {
          const enrollmentQuery = `
            INSERT INTO student_enrollments (student_id, class_id, status)
            VALUES ($1, $2, 'enrolled')
            ON CONFLICT (student_id, class_id) DO NOTHING
          `;
          await client.query(enrollmentQuery, [id, class_id]);
        }
      }

      await client.query('COMMIT');
      res.json({ message: 'تم تحديث بيانات الطالب بنجاح', studentId: id });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث بيانات الطالب' });
  }
});

// DELETE /api/students/:id - Delete student (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const client = await db.connect();
    await client.query('BEGIN');

    try {
      // Check if student exists
      const existingStudent = await client.query('SELECT id FROM students WHERE id = $1', [id]);
      if (existingStudent.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'الطالب غير موجود' });
      }

      // Remove student from all classes
      await client.query('DELETE FROM student_enrollments WHERE student_id = $1', [id]);

      // Set student status to withdrawn instead of hard delete
      await client.query('UPDATE students SET status = $1 WHERE id = $2', ['withdrawn', id]);

      // Also deactivate the user
      await client.query('UPDATE users SET is_active = false WHERE id = $1', [id]);

      await client.query('COMMIT');
      res.json({ message: 'تم حذف الطالب بنجاح' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف الطالب' });
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