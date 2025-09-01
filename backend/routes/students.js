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

    // Handle parent linking - create relationships even if parent doesn't exist yet (constraints removed)
    let validParentId = null;
    if (parent_id) {
      const parentCheck = await client.query(
        'SELECT id FROM parents WHERE id = $1', 
        [parent_id]
      );
      
      // Create relationship regardless of whether parent exists (constraints removed)
      await client.query(`
        INSERT INTO parent_student_relationships (parent_id, student_id, is_primary, relationship_type)
        VALUES ($1, $2, true, 'parent')
        ON CONFLICT (parent_id, student_id) DO UPDATE 
        SET relationship_type = 'parent'
      `, [parent_id, id]);
      
      if (parentCheck.rows.length > 0) {
        // Parent exists - set validParentId for students table
        validParentId = parent_id;
        console.log(`Linked student ${id} to existing parent ${parent_id}`);
      } else {
        // Parent doesn't exist yet - relationship created for future
        console.log(`Created pending relationship for future parent ${parent_id} with student ${id}`);
      }
    }

    // Insert into students table (status will default to 'inactive')
    await client.query(`
      INSERT INTO students (
        id, school_level, parent_id, status
      ) VALUES ($1, $2, $3, $4)
    `, [id, school_level, validParentId, 'inactive']);

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

// GET /api/students/:studentId/enrollments - Get student enrollments
router.get('/:studentId/enrollments', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const result = await db.query(`
      SELECT 
        se.*,
        c.name as class_name,
        c.description as class_description
      FROM student_enrollments se
      JOIN classes c ON se.class_id = c.id
      WHERE se.student_id = $1
      ORDER BY se.enrolled_date DESC
    `, [studentId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات التسجيل' });
  }
});

// GET /api/students - Get all students (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { school_level, status, parent_id, class_id, page = 1, limit = 50 } = req.query;
    
    // Get current user info to check role
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    const userRole = userResult.rows[0]?.role;
    
    let query = `
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.address, u.date_of_birth, u.is_active,
        s.school_level, s.status, s.enrollment_date, s.graduation_date, s.notes,
        s.memorized_surah_id, s.memorized_ayah_number, s.target_surah_id, s.target_ayah_number,
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

    // If user is a teacher, only show students from their assigned classes
    if (userRole === 'teacher') {
      query += ` AND c.id IN (
        SELECT class_id FROM teacher_class_assignments 
        WHERE teacher_id = $${paramIndex} AND is_active = true
      )`;
      params.push(req.user.id);
      paramIndex++;
    }

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

    if (class_id) {
      query += ` AND c.id = $${paramIndex}`;
      params.push(class_id);
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
        s.parent_id, s.memorized_surah_id, s.memorized_ayah_number,
        s.target_surah_id, s.target_ayah_number, s.last_memorization_update
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
    .optional()
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

    let {
      id, first_name, second_name, third_name, last_name,
      email, phone, address, date_of_birth, school_level,
      school_id, class_id, notes, status = 'active',
      memorized_surah_id, memorized_ayah_number, target_surah_id, target_ayah_number
    } = req.body;

    const client = await db.connect();
    await client.query('BEGIN');

    try {
      // Generate ID if not provided
      if (!id) {
        // Generate a unique 10-digit ID
        let isUnique = false;
        while (!isUnique) {
          id = Math.floor(1000000000 + Math.random() * 9000000000).toString();
          const existingUser = await client.query('SELECT id FROM users WHERE id = $1', [id]);
          if (existingUser.rows.length === 0) {
            isUnique = true;
          }
        }
      } else {
        // Check if provided ID already exists
        const existingUser = await client.query('SELECT id FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'رقم الهوية مستخدم من قبل' });
        }
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
        INSERT INTO students (id, school_level, status, notes, memorized_surah_id, memorized_ayah_number, target_surah_id, target_ayah_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      await client.query(studentQuery, [
        id, school_level, status, notes || null,
        memorized_surah_id || null, memorized_ayah_number || null,
        target_surah_id || null, target_ayah_number || null
      ]);

      // Add student to class or school if provided
      if (class_id) {
        const enrollmentQuery = `
          INSERT INTO student_enrollments (student_id, class_id, status)
          VALUES ($1, $2, 'enrolled')
          ON CONFLICT (student_id, class_id) DO NOTHING
        `;
        await client.query(enrollmentQuery, [id, class_id]);
      } else if (school_id) {
        // If no specific class but school is assigned, create a general enrollment
        // First, find or create a general class for this school
        let generalClassResult;
        try {
          const generalClassQuery = `
            INSERT INTO classes (name, school_id, school_level, is_active)
            VALUES ('عام - ' || (SELECT name FROM schools WHERE id = $1), $1, $2, true)
            RETURNING id
          `;
          generalClassResult = await client.query(generalClassQuery, [school_id, school_level]);
        } catch (err) {
          // If INSERT fails (likely due to duplicate), find the existing class
          if (err.code === '23505') {
            const findGeneralClassQuery = `
              SELECT id FROM classes 
              WHERE school_id = $1 AND name LIKE 'عام -%' AND school_level = $2 AND is_active = true
              LIMIT 1
            `;
            generalClassResult = await client.query(findGeneralClassQuery, [school_id, school_level]);
          } else {
            throw err;
          }
        }
        
        if (generalClassResult.rows.length > 0) {
          const generalClassId = generalClassResult.rows[0].id;
          const enrollmentQuery = `
            INSERT INTO student_enrollments (student_id, class_id, status)
            VALUES ($1, $2, 'enrolled')
            ON CONFLICT (student_id, class_id) DO NOTHING
          `;
          await client.query(enrollmentQuery, [id, generalClassId]);
        }
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
      // If we're also assigning a school/class in this request, allow activation
      const isAssigningSchool = req.body.school_id || req.body.class_id;
      
      if (!isAssigningSchool) {
        // Only check current assignment if we're not assigning in this request
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
    }
    
    const {
      first_name, second_name, third_name, last_name,
      email, phone, address, date_of_birth, school_level,
      school_id, class_id, notes, status,
      memorized_surah_id, memorized_ayah_number, target_surah_id, target_ayah_number
    } = req.body;

    const client = await db.connect();
    await client.query('BEGIN');

    try {
      // Check if student exists and get current data
      const existingStudentQuery = `
        SELECT s.*, u.first_name, u.second_name, u.third_name, u.last_name, 
               u.email, u.phone, u.address, u.date_of_birth
        FROM students s
        JOIN users u ON s.id = u.id
        WHERE s.id = $1
      `;
      const existingStudent = await client.query(existingStudentQuery, [id]);
      if (existingStudent.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'الطالب غير موجود' });
      }
      
      const currentData = existingStudent.rows[0];

      // Update user record (only update fields that are provided)
      const userFields = [];
      const userValues = [];
      let paramCounter = 1;

      if (first_name !== undefined) {
        userFields.push(`first_name = $${paramCounter++}`);
        userValues.push(first_name);
      }
      if (second_name !== undefined) {
        userFields.push(`second_name = $${paramCounter++}`);
        userValues.push(second_name);
      }
      if (third_name !== undefined) {
        userFields.push(`third_name = $${paramCounter++}`);
        userValues.push(third_name);
      }
      if (last_name !== undefined) {
        userFields.push(`last_name = $${paramCounter++}`);
        userValues.push(last_name);
      }
      if (email !== undefined) {
        userFields.push(`email = $${paramCounter++}`);
        userValues.push(email || null);
      }
      if (phone !== undefined) {
        userFields.push(`phone = $${paramCounter++}`);
        userValues.push(phone || null);
      }
      if (address !== undefined) {
        userFields.push(`address = $${paramCounter++}`);
        userValues.push(address || null);
      }
      if (date_of_birth !== undefined) {
        userFields.push(`date_of_birth = $${paramCounter++}`);
        userValues.push(date_of_birth || null);
      }
      if (status !== undefined) {
        const isActive = status === 'active';
        userFields.push(`is_active = $${paramCounter++}`);
        userValues.push(isActive);
      }
      
      // Always update the timestamp
      userFields.push(`updated_at = CURRENT_TIMESTAMP`);
      userValues.push(id);

      if (userFields.length > 1) { // More than just timestamp
        const userQuery = `
          UPDATE users 
          SET ${userFields.join(', ')}
          WHERE id = $${paramCounter}
        `;
        await client.query(userQuery, userValues);
      }

      // Update student record (only update fields that are provided)
      const studentFields = [];
      const studentValues = [];
      let studentParamCounter = 1;

      if (school_level !== undefined) {
        studentFields.push(`school_level = $${studentParamCounter++}`);
        studentValues.push(school_level);
      }
      if (status !== undefined) {
        studentFields.push(`status = $${studentParamCounter++}`);
        studentValues.push(status);
      }
      if (notes !== undefined) {
        studentFields.push(`notes = $${studentParamCounter++}`);
        studentValues.push(notes || null);
      }
      if (memorized_surah_id !== undefined) {
        studentFields.push(`memorized_surah_id = $${studentParamCounter++}`);
        studentValues.push(memorized_surah_id || null);
      }
      if (memorized_ayah_number !== undefined) {
        studentFields.push(`memorized_ayah_number = $${studentParamCounter++}`);
        studentValues.push(memorized_ayah_number || null);
      }
      if (target_surah_id !== undefined) {
        studentFields.push(`target_surah_id = $${studentParamCounter++}`);
        studentValues.push(target_surah_id || null);
      }
      if (target_ayah_number !== undefined) {
        studentFields.push(`target_ayah_number = $${studentParamCounter++}`);
        studentValues.push(target_ayah_number || null);
      }
      
      studentValues.push(id);

      if (studentFields.length > 0) {
        const studentQuery = `
          UPDATE students 
          SET ${studentFields.join(', ')}
          WHERE id = $${studentParamCounter}
        `;
        await client.query(studentQuery, studentValues);
      }

      // Handle class/school assignment changes
      if (class_id !== undefined || school_id !== undefined) {
        // Remove student from current enrollments
        await client.query('DELETE FROM student_enrollments WHERE student_id = $1 AND status = $2', [id, 'enrolled']);

        // Add to new class if provided
        if (class_id) {
          const enrollmentQuery = `
            INSERT INTO student_enrollments (student_id, class_id, status)
            VALUES ($1, $2, 'enrolled')
            ON CONFLICT (student_id, class_id) DO NOTHING
          `;
          await client.query(enrollmentQuery, [id, class_id]);
        } else if (school_id) {
          // If no specific class but school is assigned, create a general enrollment
          // First, find or create a general class for this school
          let generalClassResult;
          try {
            const generalClassQuery = `
              INSERT INTO classes (name, school_id, school_level, is_active)
              VALUES ('عام - ' || (SELECT name FROM schools WHERE id = $1), $1, $2, true)
              RETURNING id
            `;
            generalClassResult = await client.query(generalClassQuery, [school_id, school_level]);
          } catch (err) {
            // If INSERT fails (likely due to duplicate), find the existing class
            if (err.code === '23505') {
              const findGeneralClassQuery = `
                SELECT id FROM classes 
                WHERE school_id = $1 AND name LIKE 'عام -%' AND school_level = $2 AND is_active = true
                LIMIT 1
              `;
              generalClassResult = await client.query(findGeneralClassQuery, [school_id, school_level]);
            } else {
              throw err;
            }
          }
          
          if (generalClassResult.rows.length > 0) {
            const generalClassId = generalClassResult.rows[0].id;
            const enrollmentQuery = `
              INSERT INTO student_enrollments (student_id, class_id, status)
              VALUES ($1, $2, 'enrolled')
              ON CONFLICT (student_id, class_id) DO NOTHING
            `;
            await client.query(enrollmentQuery, [id, generalClassId]);
          }
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

// DELETE /api/students/:id - Delete student (hard delete)
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

      // Remove student from all classes (foreign key relationships)
      await client.query('DELETE FROM student_enrollments WHERE student_id = $1', [id]);

      // Delete any attendance records
      await client.query('DELETE FROM attendance WHERE student_id = $1', [id]);

      // Delete student record (hard delete)
      await client.query('DELETE FROM students WHERE id = $1', [id]);

      // Delete user account (hard delete)
      await client.query('DELETE FROM users WHERE id = $1', [id]);

      await client.query('COMMIT');
      res.json({ message: 'تم حذف الطالب نهائياً من قاعدة البيانات' });

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

// GET /api/students/available - Get students available for parent linking
router.get('/available', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.second_name,
        u.third_name,
        u.last_name,
        s.age,
        s.school_level,
        c.name as class_name,
        se.enrollment_date
      FROM users u
      JOIN students s ON u.id = s.id
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'enrolled'
      LEFT JOIN classes c ON se.class_id = c.id
      WHERE u.is_active = true 
      ORDER BY u.first_name, u.last_name
    `);

    res.json({
      success: true,
      students: result.rows
    });
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تحميل الطلاب المتاحين'
    });
  }
});

// Student Goals endpoints

// Initialize student_goals table
const initializeGoalsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS student_goals (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        target_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        created_by VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_student_goals_student_id 
      ON student_goals(student_id);
    `);

    console.log('Student goals table initialized successfully');
  } catch (error) {
    console.error('Error initializing student goals table:', error);
  }
};

// Initialize table on module load
initializeGoalsTable();

// Get goals for a specific student
router.get('/:studentId/goals', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const result = await db.query(`
      SELECT 
        sg.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM student_goals sg
      LEFT JOIN users u ON sg.created_by = u.id
      WHERE sg.student_id = $1
      ORDER BY sg.completed ASC, sg.target_date ASC
    `, [studentId]);
    
    res.json({ goals: result.rows });
  } catch (error) {
    console.error('Error fetching student goals:', error);
    res.status(500).json({ error: 'خطأ في جلب أهداف الطالب' });
  }
});

// Create a new goal for a student
router.post('/:studentId/goals', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { title, description, target_date } = req.body;
    const createdBy = req.user.id;
    
    if (!title) {
      return res.status(400).json({ error: 'عنوان الهدف مطلوب' });
    }
    
    const result = await db.query(`
      INSERT INTO student_goals 
      (student_id, title, description, target_date, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [studentId, title, description, target_date, createdBy]);
    
    res.status(201).json({ 
      message: 'تم إنشاء الهدف بنجاح',
      goal: result.rows[0] 
    });
  } catch (error) {
    console.error('Error creating student goal:', error);
    res.status(500).json({ error: 'خطأ في إنشاء الهدف' });
  }
});

// Update a goal
router.put('/:studentId/goals/:goalId', auth, async (req, res) => {
  try {
    const { studentId, goalId } = req.params;
    const { title, description, target_date, completed } = req.body;
    
    const result = await db.query(`
      UPDATE student_goals
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        target_date = COALESCE($3, target_date),
        completed = COALESCE($4, completed),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND student_id = $6
      RETURNING *
    `, [title, description, target_date, completed, goalId, studentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الهدف غير موجود' });
    }
    
    res.json({ 
      message: 'تم تحديث الهدف بنجاح',
      goal: result.rows[0] 
    });
  } catch (error) {
    console.error('Error updating student goal:', error);
    res.status(500).json({ error: 'خطأ في تحديث الهدف' });
  }
});

// Delete a goal
router.delete('/:studentId/goals/:goalId', auth, async (req, res) => {
  try {
    const { studentId, goalId } = req.params;
    
    const result = await db.query(
      'DELETE FROM student_goals WHERE id = $1 AND student_id = $2 RETURNING *',
      [goalId, studentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الهدف غير موجود' });
    }
    
    res.json({ message: 'تم حذف الهدف بنجاح' });
  } catch (error) {
    console.error('Error deleting student goal:', error);
    res.status(500).json({ error: 'خطأ في حذف الهدف' });
  }
});

module.exports = router;