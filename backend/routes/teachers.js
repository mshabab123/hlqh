const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
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
    .notEmpty()
    .withMessage('يرجى اختيار مجمع الحلقات')
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

// POST /api/teachers - Register a teacher, admin, administrator, or supervisor
router.post('/', registerLimiter, teacherValidationRules, async (req, res) => {
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
      created_by
    } = req.body;

    await client.query('BEGIN');

    // Validate school exists
    const schoolCheck = await client.query('SELECT id FROM schools WHERE id = $1', [school_id]);
    if (schoolCheck.rows.length === 0) {
      return res.status(400).json({ error: 'مجمع الحلقات المحدد غير موجود' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table (inactive by default)
    await client.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name, email, 
        phone, password, address, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [id, first_name, second_name, third_name, last_name, email, phone, hashedPassword, address || null, false]);

    // Insert into appropriate role table based on user_type
    switch (user_type) {
      case 'teacher':
        // Store school_id in qualifications field with prefix
        const teacherQualifications = qualifications ? `SCHOOL_ID:${school_id}|${qualifications}` : `SCHOOL_ID:${school_id}`;
        await client.query(`
          INSERT INTO teachers (
            id, specialization, qualifications, salary
          ) VALUES ($1, $2, $3, $4)
        `, [id, specialization || null, teacherQualifications, salary || null]);
        break;

      case 'admin':
        await client.query(`
          INSERT INTO admins (
            id, qualifications, salary, created_by
          ) VALUES ($1, $2, $3, $4)
        `, [id, qualifications || null, salary || null, created_by || null]);
        break;

      case 'administrator':
        // Store school_id in qualifications field with prefix
        const adminQualifications = qualifications ? `SCHOOL_ID:${school_id}|${qualifications}` : `SCHOOL_ID:${school_id}`;
        await client.query(`
          INSERT INTO administrators (
            id, qualifications, salary
          ) VALUES ($1, $2, $3)
        `, [id, adminQualifications, salary || null]);
        break;

      case 'supervisor':
        // Store school_id in qualifications field with prefix
        const supervisorQualifications = qualifications ? `SCHOOL_ID:${school_id}|${qualifications}` : `SCHOOL_ID:${school_id}`;
        await client.query(`
          INSERT INTO supervisors (
            id, qualifications, salary
          ) VALUES ($1, $2, $3)
        `, [id, supervisorQualifications, salary || null]);
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

// GET /api/teachers/:id - Get user details (teacher, admin, administrator, supervisor)
router.get('/:id', async (req, res) => {
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
router.get('/', async (req, res) => {
  try {
    const { user_type = 'teacher', school_id, is_active } = req.query;
    let query, tableName, additionalFields;

    switch (user_type) {
      case 'teacher':
        tableName = 'teachers';
        additionalFields = 't.specialization, t.hire_date, t.status';
        break;
      case 'admin':
        tableName = 'admins';
        additionalFields = 't.role, t.hire_date, t.status, t.permissions';
        break;
      case 'administrator':
        tableName = 'administrators';
        additionalFields = 't.role, t.hire_date, t.status, t.permissions';
        break;
      case 'supervisor':
        tableName = 'supervisors';
        additionalFields = 't.role, t.hire_date, t.status, t.permissions, t.supervised_areas';
        break;
      default:
        return res.status(400).json({ error: 'نوع المستخدم غير صحيح' });
    }

    let whereClause = 'WHERE 1=1';
    let params = [];
    
    // Add school filtering if provided (using qualifications column with SCHOOL_ID prefix)
    if (school_id) {
      whereClause += ` AND t.qualifications LIKE $${params.length + 1}`;
      params.push(`SCHOOL_ID:${school_id}%`);
    }

    // Add active status filtering if provided
    if (is_active !== undefined) {
      whereClause += ` AND u.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    query = `
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.address, u.is_active, u.created_at, 
        ${additionalFields}, '${user_type}' as user_type,
        CASE 
          WHEN t.qualifications LIKE 'SCHOOL_ID:%' 
          THEN substring(t.qualifications from 'SCHOOL_ID:([^|]+)')
          ELSE NULL 
        END as school_id,
        CASE 
          WHEN t.qualifications LIKE 'SCHOOL_ID:%|%' 
          THEN substring(t.qualifications from 'SCHOOL_ID:[^|]+\\|(.+)')
          ELSE CASE 
            WHEN t.qualifications LIKE 'SCHOOL_ID:%' 
            THEN NULL
            ELSE t.qualifications 
          END
        END as actual_qualifications,
        COALESCE(
          ARRAY_AGG(DISTINCT tca.class_id) FILTER (WHERE tca.class_id IS NOT NULL),
          ARRAY[]::UUID[]
        ) as class_ids
      FROM users u
      JOIN ${tableName} t ON u.id = t.id
      LEFT JOIN teacher_class_assignments tca ON u.id = tca.teacher_id AND tca.is_active = TRUE
      ${whereClause}
      GROUP BY u.id, u.first_name, u.second_name, u.third_name, u.last_name,
               u.email, u.phone, u.address, u.is_active, u.created_at, 
               t.specialization, t.hire_date, t.status, t.qualifications
      ORDER BY u.is_active DESC, u.first_name, u.last_name
    `;

    const result = await db.query(query, params);

    const responseKey = user_type === 'teacher' ? 'teachers' : `${user_type}s`;
    res.json({ [responseKey]: result.rows });

  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المستخدمين' });
  }
});

// PUT /api/teachers/:id - Update teacher information
router.put('/:id', async (req, res) => {
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
      qualifications
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
        address = $7
      WHERE id = $8
    `, [first_name, second_name, third_name, last_name, email, phone, address || null, id]);

    // Update teachers table with school_id and qualifications
    const updatedQualifications = qualifications && school_id ? `SCHOOL_ID:${school_id}|${qualifications}` : 
                                 school_id ? `SCHOOL_ID:${school_id}` : qualifications;

    await client.query(`
      UPDATE teachers SET 
        specialization = COALESCE($1, specialization),
        qualifications = COALESCE($2, qualifications)
      WHERE id = $3
    `, [specialization, updatedQualifications, id]);

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
router.delete('/:id', async (req, res) => {
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
router.patch('/:id/activate', async (req, res) => {
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

// POST /api/teachers/:id/classes - Assign multiple classes to teacher
router.post('/:id/classes', async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { class_ids = [] } = req.body; // Array of class IDs

    await client.query('BEGIN');

    // Check if teacher exists
    const teacherCheck = await client.query('SELECT id FROM teachers WHERE id = $1', [id]);
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({ error: 'المعلم غير موجود' });
    }

    // Remove all existing assignments for this teacher
    await client.query('DELETE FROM teacher_class_assignments WHERE teacher_id = $1', [id]);

    // Add new assignments
    if (class_ids.length > 0) {
      for (const classId of class_ids) {
        // Verify class exists
        const classCheck = await client.query('SELECT id FROM classes WHERE id = $1', [classId]);
        if (classCheck.rows.length > 0) {
          await client.query(`
            INSERT INTO teacher_class_assignments (teacher_id, class_id)
            VALUES ($1, $2)
            ON CONFLICT (teacher_id, class_id) DO NOTHING
          `, [id, classId]);
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
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.status = 'enrolled') as enrolled_students
      FROM teacher_class_assignments tca
      JOIN classes c ON tca.class_id = c.id
      JOIN schools s ON c.school_id = s.id
      LEFT JOIN semesters sem ON c.semester_id = sem.id
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

// GET /api/teachers/:id/classes - Get classes assigned to teacher (admin use)
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