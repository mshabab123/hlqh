const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');
const { BCRYPT_ROUNDS } = require('../config/security');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');

const rateLimit = require('express-rate-limit');
const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // limit each IP to 10 requests per windowMs
  message: { error: "لقد تجاوزت الحد المسموح لمحاولات التسجيل. حاول لاحقًا." }
});

// Teacher/Admin registration validation rules
const teacherValidationRules = [
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
  body('user_type')
    .isIn(['teacher', 'admin', 'administrator', 'supervisor'])
    .withMessage('نوع المستخدم يجب أن يكون معلم أو مدير أو مسؤول أو مشرف'),
  body('school_id')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('معرف مجمع الحلقات غير صحيح'),
  body('specialization')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('التخصص يجب أن يكون أقل من 100 حرف'),
  body('qualifications')
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 })
    .withMessage('المؤهلات يجب أن تكون أقل من 1000 حرف')
];

// Public pending registration for teachers and school administrators only.
// Root admin and supervisor accounts must still be created by an active admin.
router.post('/register', registerLimiter, teacherValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

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
    user_type,
    school_id,
    specialization,
    qualifications,
  } = req.body;

  if (!['teacher', 'administrator'].includes(user_type)) {
    return res.status(400).json({ error: 'نوع التسجيل غير متاح من الصفحة العامة' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    if (school_id) {
      const schoolCheck = await client.query('SELECT id FROM schools WHERE id = $1', [school_id]);
      if (schoolCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'مجمع الحلقات المحدد غير موجود' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await client.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name, email,
        phone, password, address, is_active, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10)
    `, [id, first_name, second_name, third_name, last_name, email, phone, hashedPassword, address || null, user_type]);

    if (user_type === 'teacher') {
      await client.query(`
        INSERT INTO teachers (
          id, specialization, qualifications, salary, school_id
        ) VALUES ($1, $2, $3, NULL, $4)
      `, [id, specialization || null, qualifications || null, school_id || null]);
    } else {
      await client.query(`
        INSERT INTO administrators (
          id, role, qualifications, salary, school_id
        ) VALUES ($1, 'administrator', $2, NULL, $3)
      `, [id, qualifications || null, school_id || null]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'تم استلام طلب التسجيل بنجاح. سيتم مراجعة الطلب من الإدارة قبل تفعيل الحساب.',
      userId: id,
      userType: user_type,
      status: 'pending_activation',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Public staff registration error:', err);

    if (err.code === '23505') {
      return res.status(400).json({ error: 'رقم الهوية أو البريد الإلكتروني مستخدم من قبل' });
    }

    res.status(500).json({ error: 'حدث خطأ أثناء التسجيل' });
  } finally {
    client.release();
  }
});

// POST /api/teachers - Create a teacher/admin/administrator/supervisor account.
// Admin-only: this endpoint can mint privileged staff roles.
router.post('/', authenticateToken, requireRole(ROLES.ADMIN), teacherValidationRules, async (req, res) => {
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
      user_type,
      school_id,
      specialization,
      qualifications,
      salary,
      created_by,
      can_assign_registered_students = true
    } = req.body;

    await client.query('BEGIN');

    // Validate school exists (only if provided and not for administrators)
    if (school_id && user_type !== 'administrator') {
      const schoolCheck = await client.query('SELECT id FROM schools WHERE id = $1', [school_id]);
      if (schoolCheck.rows.length === 0) {
        return res.status(400).json({ error: 'مجمع الحلقات المحدد غير موجود' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert into users table (inactive by default) with proper role
    await client.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name, email,
        phone, password, address, is_active, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [id, first_name, second_name, third_name, last_name, email, phone, hashedPassword, address || null, false, user_type]);

    
    // Insert into appropriate role table based on user_type
    switch (user_type) {
      case 'teacher':
        // Store school_id and qualifications in separate columns
        await client.query(`
          INSERT INTO teachers (
            id, specialization, qualifications, salary, school_id, can_assign_registered_students
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, specialization || null, qualifications || null, salary || null, school_id || null, Boolean(can_assign_registered_students)]);
        break;

      case 'admin':
        await client.query(`
          INSERT INTO admins (
            id, qualifications, salary, created_by
          ) VALUES ($1, $2, $3, $4)
        `, [id, qualifications || null, salary || null, created_by || null]);
        break;

      case 'administrator':
        // Store school_id and qualifications in separate columns
        await client.query(`
          INSERT INTO administrators (
            id, role, qualifications, salary, school_id
          ) VALUES ($1, $2, $3, $4, $5)
        `, [id, 'administrator', qualifications || null, salary || null, school_id || null]);
        break;

      case 'supervisor':
        // Store school_id and qualifications in separate columns
        await client.query(`
          INSERT INTO supervisors (
            id, qualifications, salary, school_id
          ) VALUES ($1, $2, $3, $4)
        `, [id, qualifications || null, salary || null, school_id || null]);
        break;

      default:
        throw new Error('Invalid user type');
    }

    await client.query('COMMIT');
    
    const userTypeArabic = {
      teacher: 'المعلم',
      admin: 'مدير منصة',
      administrator: 'مدير مجمع',
      supervisor: 'المشرف'
    };

    res.status(201).json({ 
      message: `✅ تم تسجيل طلب ${userTypeArabic[user_type]} بنجاح. سيتم مراجعة طلبك وإشعارك عند تفعيل الحساب.`,
      userId: id,
      userType: user_type,
      status: 'pending_activation',
      note: 'الحساب غير مفعل حتى موافقة الإدارة'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`${req.body.user_type} registration error:`, err);

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

    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب' });
  } finally {
    client.release();
  }
});

// GET /api/teachers/my-classes - Get classes for authenticated teacher
router.get('/my-classes', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const userRole = req.user.role;
    
    // Check if user is a teacher
    if (userRole !== 'teacher' && userRole !== 'administrator' && userRole !== 'supervisor' && userRole !== 'admin') {
      return res.status(403).json({ error: 'غير مسموح - هذه الصفحة للمعلمين فقط' });
    }
    
    const result = await db.query(`
      SELECT 
        c.id, 
        c.name, 
        c.max_students, 
        c.school_level,
        c.room_number,
        c.is_active,
        s.name as school_name,
        s.id as school_id,
        sem.display_name as semester_name,
        sem.id as semester_id,
        COALESCE(t.can_assign_registered_students, true) as can_assign_registered_students,
        tca.teacher_role,
        COALESCE(CONCAT(ptu.first_name, ' ', ptu.last_name), '-') as teacher_name,
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.status = 'enrolled') as student_count
      FROM teacher_class_assignments tca
      JOIN classes c ON tca.class_id = c.id
      LEFT JOIN teachers t ON t.id = tca.teacher_id
      JOIN schools s ON c.school_id = s.id
      LEFT JOIN semesters sem ON c.semester_id = sem.id
      LEFT JOIN teacher_class_assignments tca_primary ON c.id = tca_primary.class_id
        AND tca_primary.teacher_role = 'primary' AND tca_primary.is_active = TRUE
      LEFT JOIN users ptu ON tca_primary.teacher_id = ptu.id
      WHERE tca.teacher_id = $1 AND tca.is_active = TRUE AND c.is_active = TRUE
      ORDER BY s.name, c.name
    `, [teacherId]);

    res.json({ 
      success: true,
      classes: result.rows,
      teacherId: teacherId,
      totalClasses: result.rows.length
    });

  } catch (err) {
    console.error('Get teacher classes error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الحلقات الخاصة بك' });
  }
});

// GET /api/teachers/my-classes/:classId/students - Get students in a class for authenticated teacher
router.get('/my-classes/:classId/students', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { classId } = req.params;
    
    // Verify teacher is assigned to this class
    const classCheck = await db.query(`
      SELECT c.id, c.name 
      FROM teacher_class_assignments tca
      JOIN classes c ON tca.class_id = c.id
      WHERE tca.teacher_id = $1 AND tca.class_id = $2 AND tca.is_active = TRUE
    `, [teacherId, classId]);
    
    if (classCheck.rows.length === 0) {
      return res.status(403).json({ error: 'غير مسموح - لست مسؤولاً عن هذه الحلقة' });
    }
    
    // Get students in the class
    const studentsResult = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.second_name,
        u.third_name,
        u.last_name,
        u.phone,
        u.email,
        s.school_level,
        s.memorized_surah_id,
        s.memorized_ayah_number,
        s.target_surah_id,
        s.target_ayah_number,
        se.enrollment_date,
        se.final_grade
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE se.class_id = $1 AND se.status = 'enrolled'
      ORDER BY u.first_name, u.last_name
    `, [classId]);
    
    res.json({
      success: true,
      className: classCheck.rows[0].name,
      students: studentsResult.rows,
      totalStudents: studentsResult.rows.length
    });
    
  } catch (err) {
    console.error('Get class students error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب طلاب الحلقة' });
  }
});

// GET /api/teachers/:id - Get user details (teacher, admin, administrator, supervisor)
router.get('/:id', authenticateToken, requireRole(ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get basic user info
    const userResult = await db.query(`
      SELECT id, first_name, second_name, third_name, last_name,
             email, phone, address, created_at, is_active
      FROM users WHERE id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const user = userResult.rows[0];
    let roleData = null;
    let userType = null;

    // Try to find the user in different role tables
    const teacherResult = await db.query(`
      SELECT specialization, hire_date, salary, status, qualifications, 'teacher' as user_type
      FROM teachers WHERE id = $1
    `, [id]);

    const adminResult = await db.query(`
      SELECT role, hire_date, salary, status, qualifications, permissions, created_by, 'admin' as user_type
      FROM admins WHERE id = $1
    `, [id]);

    const administratorResult = await db.query(`
      SELECT role, hire_date, salary, status, qualifications, permissions, 'administrator' as user_type
      FROM administrators WHERE id = $1
    `, [id]);

    const supervisorResult = await db.query(`
      SELECT role, hire_date, salary, status, qualifications, permissions, supervised_areas, 'supervisor' as user_type
      FROM supervisors WHERE id = $1
    `, [id]);

    // Determine user type and get role data
    if (teacherResult.rows.length > 0) {
      roleData = teacherResult.rows[0];
      userType = 'teacher';
    } else if (adminResult.rows.length > 0) {
      roleData = adminResult.rows[0];
      userType = 'admin';
    } else if (administratorResult.rows.length > 0) {
      roleData = administratorResult.rows[0];
      userType = 'administrator';
    } else if (supervisorResult.rows.length > 0) {
      roleData = supervisorResult.rows[0];
      userType = 'supervisor';
    } else {
      return res.status(404).json({ error: 'لم يتم العثور على دور المستخدم' });
    }

    res.json({
      ...user,
      ...roleData,
      user_type: userType
    });

  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات المستخدم' });
  }
});

// GET /api/teachers - Get all users by type (teachers, admins, administrators, supervisors)
router.get('/', authenticateToken, requireRole(ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { user_type = 'teacher', school_id, is_active } = req.query;
    
    // Use the new users.role column
    let whereClause = 'WHERE u.role = $1';
    let params = [user_type];
    
    // Add active status filtering if provided
    if (is_active !== undefined) {
      whereClause += ` AND u.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    // Build query based on whether we have school filtering
    let query;
    if (school_id) {
      // If school_id is provided, filter by teachers in that school
      // Teachers can be in a school either through class assignments or direct school assignment
      whereClause = `${whereClause} AND (
        c.school_id = $${params.length + 1} OR
        t.school_id = $${params.length + 1}
      )`;
      params.push(school_id);

      query = `
        SELECT DISTINCT
          u.id,
          u.first_name,
          u.second_name,
          u.third_name,
          u.last_name,
          u.email,
          u.phone,
          u.address,
          u.is_active,
          u.created_at,
          u.role as role_type,
          u.role as user_type,
          t.specialization,
          COALESCE(t.can_assign_registered_students, true) as can_assign_registered_students,
          COALESCE(c.school_id, t.school_id) as school_id,
          t.qualifications,
          COALESCE(
            ARRAY_AGG(DISTINCT tca.class_id) FILTER (WHERE tca.class_id IS NOT NULL AND cursem.id IS NOT NULL),
            ARRAY[]::UUID[]
          ) as class_ids
        FROM users u
        LEFT JOIN teachers t ON u.id = t.id
        LEFT JOIN teacher_class_assignments tca ON u.id = tca.teacher_id AND tca.is_active = TRUE
        LEFT JOIN classes c ON tca.class_id = c.id
        LEFT JOIN semesters cursem ON cursem.id = c.semester_id
          AND cursem.start_date <= CURRENT_DATE AND cursem.end_date >= CURRENT_DATE
        ${whereClause}
        GROUP BY u.id, u.first_name, u.second_name, u.third_name, u.last_name,
                 u.email, u.phone, u.address, u.is_active, u.created_at,
                 u.role, c.school_id, t.school_id, t.qualifications, t.specialization, t.can_assign_registered_students
        ORDER BY u.is_active DESC, u.first_name, u.last_name
      `;
    } else {
      // No school filtering - get all users with the specified role
      query = `
        SELECT
          u.id,
          u.first_name,
          u.second_name,
          u.third_name,
          u.last_name,
          u.email,
          u.phone,
          u.address,
          u.is_active,
          u.created_at,
          u.role as role_type,
          u.role as user_type,
          t.qualifications,
          t.specialization,
          t.school_id,
          COALESCE(t.can_assign_registered_students, true) as can_assign_registered_students,
          COALESCE(
            ARRAY_AGG(DISTINCT tca.class_id) FILTER (WHERE tca.class_id IS NOT NULL AND cursem.id IS NOT NULL),
            ARRAY[]::UUID[]
          ) as class_ids
        FROM users u
        LEFT JOIN teachers t ON u.id = t.id
        LEFT JOIN teacher_class_assignments tca ON u.id = tca.teacher_id AND tca.is_active = TRUE
        LEFT JOIN classes tcls ON tca.class_id = tcls.id
        LEFT JOIN semesters cursem ON cursem.id = tcls.semester_id
          AND cursem.start_date <= CURRENT_DATE AND cursem.end_date >= CURRENT_DATE
        ${whereClause}
        GROUP BY u.id, u.first_name, u.second_name, u.third_name, u.last_name,
                 u.email, u.phone, u.address, u.is_active, u.created_at,
                 u.role, t.qualifications, t.specialization, t.school_id, t.can_assign_registered_students
        ORDER BY u.is_active DESC, u.first_name, u.last_name
      `;
    }

    const result = await db.query(query, params);

    const responseKey = user_type === 'teacher' ? 'teachers' : `${user_type}s`;
    res.json({ [responseKey]: result.rows });

  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المستخدمين' });
  }
});

// PUT /api/teachers/:id - Update teacher information
router.put('/:id', authenticateToken, requireRole(ROLES.ADMINISTRATOR), async (req, res) => {
  const client = await db.connect();
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
      school_id,
      specialization,
      qualifications,
      can_assign_registered_students
    } = req.body;

    await client.query('BEGIN');

    // Check if teacher exists
    const teacherCheck = await client.query('SELECT id FROM teachers WHERE id = $1', [id]);
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({ error: 'المعلم غير موجود' });
    }

    // Validate school exists if school_id is provided
    if (school_id) {
      const schoolCheck = await client.query('SELECT id FROM schools WHERE id = $1', [school_id]);
      if (schoolCheck.rows.length === 0) {
        return res.status(400).json({ error: 'مجمع الحلقات المحدد غير موجود' });
      }
    }

    // Update users table
    await client.query(`
      UPDATE users SET 
        first_name = COALESCE($1, first_name),
        second_name = COALESCE($2, second_name),
        third_name = COALESCE($3, third_name),
        last_name = COALESCE($4, last_name),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        address = COALESCE($7, address)
      WHERE id = $8
    `, [first_name, second_name, third_name, last_name, email, phone, address !== undefined ? (address || '') : null, id]);

    // Update teachers table with school_id and qualifications in separate columns
    await client.query(`
      UPDATE teachers SET
        specialization = COALESCE($1, specialization),
        qualifications = COALESCE($2, qualifications),
        school_id = COALESCE($3, school_id),
        can_assign_registered_students = COALESCE($4, can_assign_registered_students)
      WHERE id = $5
    `, [
      specialization,
      qualifications,
      school_id,
      typeof can_assign_registered_students === 'boolean' ? can_assign_registered_students : null,
      id
    ]);

    await client.query('COMMIT');
    
    res.json({ 
      message: '✅ تم تحديث المعلم بنجاح',
      teacherId: id
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update teacher error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث المعلم' });
  } finally {
    client.release();
  }
});

// DELETE /api/teachers/:id - Delete teacher
router.delete('/:id', authenticateToken, requireRole(ROLES.ADMINISTRATOR), async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');
    
    // Check if teacher has any classes assigned
    const classCheck = await client.query(
      'SELECT COUNT(*) as count FROM classes WHERE room_number = $1',
      [id]
    );
    
    if (parseInt(classCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'لا يمكن حذف المعلم لأنه مسؤول عن حلقات دراسية' 
      });
    }

    // Delete from teachers table first (foreign key constraint)
    const teacherResult = await client.query('DELETE FROM teachers WHERE id = $1 RETURNING id', [id]);
    
    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: 'المعلم غير موجود' });
    }

    // Delete from users table
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: '✅ تم حذف المعلم بنجاح' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete teacher error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف المعلم' });
  } finally {
    client.release();
  }
});

// PATCH /api/teachers/:id/activate - Toggle teacher activation status
router.patch('/:id/activate', authenticateToken, requireRole(ROLES.ADMINISTRATOR), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Update user activation status
    const result = await db.query(`
      UPDATE users SET is_active = $1 WHERE id = $2 RETURNING is_active
    `, [is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المعلم غير موجود' });
    }

    const status = result.rows[0].is_active ? 'تم تفعيل' : 'تم إلغاء تفعيل';
    res.json({ 
      message: `✅ ${status} المعلم بنجاح`,
      is_active: result.rows[0].is_active
    });

  } catch (err) {
    console.error('Toggle teacher activation error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تغيير حالة التفعيل' });
  }
});

// POST /api/teachers/:id/classes - Assign multiple classes to teacher with role designation
router.post('/:id/classes', authenticateToken, requireRole(ROLES.ADMINISTRATOR), async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { class_ids = [], class_roles = {} } = req.body; // Array of class IDs and optional role mapping

    await client.query('BEGIN');

    // Check if teacher exists
    const teacherCheck = await client.query('SELECT id FROM teachers WHERE id = $1', [id]);
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({ error: 'المعلم غير موجود' });
    }

    // Replace assignments ONLY within the target semester (the current one by
    // date, or an explicit semester_id). Assignments from other semesters are
    // history — the teacher keeps the record of what he taught before.
    let semesterId = req.body.semester_id || null;
    if (!semesterId) {
      const currentSemester = await client.query(
        `SELECT id FROM semesters
         WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
         ORDER BY start_date DESC LIMIT 1`
      );
      semesterId = currentSemester.rows[0]?.id || null;
    }

    if (semesterId) {
      await client.query(
        `DELETE FROM teacher_class_assignments tca
         USING classes c
         WHERE tca.class_id = c.id
           AND tca.teacher_id = $1
           AND c.semester_id = $2`,
        [id, semesterId]
      );
    } else {
      // No active semester found — fall back to the old full replace.
      await client.query('DELETE FROM teacher_class_assignments WHERE teacher_id = $1', [id]);
    }

    // Add new assignments (restricted to the target semester when one is set)
    if (class_ids.length > 0) {
      for (const classId of class_ids) {
        // Verify class exists and belongs to the target semester
        const classCheck = await client.query('SELECT id, semester_id FROM classes WHERE id = $1', [classId]);
        if (semesterId && classCheck.rows[0] && String(classCheck.rows[0].semester_id) !== String(semesterId)) {
          continue;
        }
        if (classCheck.rows.length > 0) {
          // Determine teacher role for this class
          const role = class_roles[classId] || 'secondary';
          
          // Check if there's already a primary teacher for this class
          if (role === 'primary') {
            // Demote any existing primary teacher to secondary
            await client.query(`
              UPDATE teacher_class_assignments 
              SET teacher_role = 'secondary'
              WHERE class_id = $1 AND teacher_role = 'primary' AND teacher_id != $2
            `, [classId, id]);
          }
          
          await client.query(`
            INSERT INTO teacher_class_assignments (teacher_id, class_id, teacher_role)
            VALUES ($1, $2, $3)
            ON CONFLICT (teacher_id, class_id) DO UPDATE 
            SET teacher_role = $3, is_active = TRUE
          `, [id, classId, role]);
        }
      }
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: '✅ تم تحديث تعيينات الحلقات للمعلم بنجاح',
      teacherId: id,
      assignedClasses: class_ids.length
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assign teacher classes error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تعيين الحلقات للمعلم' });
  } finally {
    client.release();
  }
});

// GET /api/teachers/:id/classes - Get classes assigned to teacher (admin use)
// GET /api/teachers/:id/class-history - Every class the teacher has taught,
// across all semesters (active and previous), newest semester first.
router.get('/:id/class-history', authenticateToken, requireRole(ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        c.id as class_id,
        c.name as class_name,
        c.school_level,
        s.name as school_name,
        sem.id as semester_id,
        sem.display_name as semester_name,
        sem.year as semester_year,
        tca.teacher_role,
        tca.is_active,
        COUNT(se.student_id) FILTER (WHERE se.status = 'enrolled')::int as students_count
      FROM teacher_class_assignments tca
      JOIN classes c ON tca.class_id = c.id
      LEFT JOIN schools s ON c.school_id = s.id
      LEFT JOIN semesters sem ON c.semester_id = sem.id
      LEFT JOIN student_enrollments se ON se.class_id = c.id
      WHERE tca.teacher_id = $1
      GROUP BY c.id, c.name, c.school_level, s.name,
               sem.id, sem.display_name, sem.year, tca.teacher_role, tca.is_active
      ORDER BY sem.id DESC NULLS LAST, c.name
    `, [id]);

    res.json({ history: result.rows });
  } catch (err) {
    console.error('Get teacher class history error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل حلقات المعلم' });
  }
});

router.get('/:id/classes', authenticateToken, requireRole(ROLES.ADMINISTRATOR), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        c.id, c.name, c.max_students, c.school_level,
        s.name as school_name,
        sem.display_name as semester_name
      FROM teacher_class_assignments tca
      JOIN classes c ON tca.class_id = c.id
      JOIN schools s ON c.school_id = s.id
      LEFT JOIN semesters sem ON c.semester_id = sem.id
      WHERE tca.teacher_id = $1 AND tca.is_active = TRUE
      ORDER BY c.name
    `, [id]);

    res.json({ classes: result.rows });

  } catch (err) {
    console.error('Get teacher classes error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب حلقات المعلم' });
  }
});

module.exports = router;
