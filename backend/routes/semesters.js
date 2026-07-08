const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');
const { canAccessSchool, canAccessClass } = require('../utils/accessScope');
const { requireFeature, canUseFeature } = require('../utils/featurePrivileges');

const STAFF_REGISTRATION_ROLES = ['admin', 'administrator', 'supervisor', 'teacher'];

async function canRegisterStudent(req, studentId) {
  if (!studentId) return false;

  if (String(req.user.id) === String(studentId) && ['student', 'parent_student'].includes(req.user.role)) {
    return true;
  }

  if (['parent', 'parent_student'].includes(req.user.role)) {
    const result = await pool.query(
      `SELECT 1
       FROM parent_student_relationships
       WHERE parent_id = $1 AND student_id = $2
       LIMIT 1`,
      [req.user.id, studentId]
    );
    return result.rows.length > 0;
  }

  // Staff registering another student is governed by the feature-privileges table.
  return canUseFeature(req.user, 'register_student_semester');
}

async function getSemesterWithAccess(req, semesterId, allowTeacher = false) {
  const semesterResult = await pool.query(
    `SELECT s.*, sc.name as school_name
     FROM semesters s
     LEFT JOIN schools sc ON s.school_id = sc.id
     WHERE s.id = $1`,
    [semesterId]
  );

  const semester = semesterResult.rows[0];
  if (!semester) {
    return { status: 404, error: 'الفصل الدراسي غير موجود' };
  }

  if (allowTeacher && req.user.role === 'teacher') {
    const teacherAccess = await pool.query(
      `SELECT 1
       FROM classes c
       JOIN teacher_class_assignments tca ON c.id = tca.class_id
       WHERE c.semester_id = $1
         AND tca.teacher_id = $2
         AND tca.is_active = true
       LIMIT 1`,
      [semesterId, req.user.id]
    );
    if (teacherAccess.rows.length > 0) {
      return { semester };
    }
  }

  if (!(await canAccessSchool(pool, req.user, semester.school_id))) {
    return { status: 403, error: 'Access denied for this semester' };
  }

  return { semester };
}

async function teacherCanAssignRegisteredStudents(teacherId) {
  const result = await pool.query(
    `SELECT COALESCE(can_assign_registered_students, true) as allowed
     FROM teachers
     WHERE id = $1`,
    [teacherId]
  );
  return result.rows[0]?.allowed !== false;
}

// Get all semesters (optionally filtered by school)
router.get('/', auth, async (req, res) => {
  try {
    const { school_id } = req.query;
    
    let query;
    let params = [];
    
    if (school_id) {
      if (!(await canAccessSchool(pool, req.user, school_id)) && !['teacher', 'student', 'parent', 'parent_student'].includes(req.user?.role)) {
        return res.status(403).json({ message: 'Access denied for this school' });
      }
      query = `
        SELECT s.*, sc.name as school_name 
        FROM semesters s
        LEFT JOIN schools sc ON s.school_id = sc.id
        WHERE s.school_id = $1 
        ORDER BY s.start_date DESC NULLS LAST, s.year DESC, s.type
      `;
      params = [school_id];
    } else {
      query = `
        SELECT s.*, sc.name as school_name 
        FROM semesters s
        LEFT JOIN schools sc ON s.school_id = sc.id
        ORDER BY sc.name, s.year DESC, s.type
      `;
    }
    
    const result = await pool.query(query, params);
    res.json({ semesters: result.rows });
  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ message: 'خطأ في جلب الفصول الدراسية' });
  }
});

// Get current semester
router.get('/current', auth, async (req, res) => {
  try {
    const currentDate = new Date();
    const result = await pool.query(`
      SELECT s.*, sc.name as school_name 
      FROM semesters s
      LEFT JOIN schools sc ON s.school_id = sc.id
      WHERE s.start_date <= $1 AND s.end_date >= $1
      ORDER BY s.start_date DESC
      LIMIT 1
    `, [currentDate]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'لا يوجد فصل دراسي نشط حالياً' });
    }
    
    res.json({ semester: result.rows[0] });
  } catch (error) {
    console.error('Error fetching current semester:', error);
    res.status(500).json({ message: 'خطأ في جلب الفصل الدراسي الحالي' });
  }
});

// Get semesters with this student's registration status
router.get('/registration-options', auth, async (req, res) => {
  try {
    const studentId = req.query.student_id || req.user.id;

    if (!(await canRegisterStudent(req, studentId))) {
      return res.status(403).json({ message: 'غير مسموح لك بعرض فصول هذا الطالب' });
    }

    const studentResult = await pool.query(
      `SELECT s.id, s.school_level, cls.school_id
       FROM students s
       LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'enrolled'
       LEFT JOIN classes cls ON se.class_id = cls.id
       WHERE s.id = $1
       LIMIT 1`,
      [studentId]
    );

    const student = studentResult.rows[0];
    if (!student) {
      return res.status(404).json({ message: 'الطالب غير موجود' });
    }

    const params = [studentId];
    let schoolFilter = '';
    if (student.school_id) {
      params.push(student.school_id);
      schoolFilter = `WHERE s.school_id = $2`;
    }

    const result = await pool.query(
      `SELECT
         s.*,
         sc.name as school_name,
         sr.status as registration_status,
         sr.class_id as registered_class_id,
         c.name as registered_class_name,
         sr.created_at as registered_at
       FROM semesters s
       LEFT JOIN schools sc ON s.school_id = sc.id
       LEFT JOIN semester_registrations sr
         ON sr.semester_id = s.id AND sr.student_id = $1
       LEFT JOIN classes c ON sr.class_id = c.id
       ${schoolFilter}
       ORDER BY s.start_date DESC NULLS LAST, s.year DESC, s.type`,
      params
    );

    res.json({ semesters: result.rows });
  } catch (error) {
    console.error('Error fetching registration options:', error);
    res.status(500).json({ message: 'خطأ في جلب فصول التسجيل' });
  }
});

// Get semester by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM semesters WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الفصل الدراسي غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching semester:', error);
    res.status(500).json({ message: 'خطأ في جلب الفصل الدراسي' });
  }
});

// Create new semester
router.post('/', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'administrator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لإنشاء فصل دراسي' });
    }

    const { type, year, start_date, end_date, display_name, school_id, weekend_days, vacation_days, registration_open = false } = req.body;

    // Validate required school_id
    if (!school_id) {
      return res.status(400).json({ message: 'يجب تحديد المجمع للفصل الدراسي' });
    }
    
    if (!(await canAccessSchool(pool, req.user, school_id))) {
      return res.status(403).json({ message: 'Access denied for this school' });
    }

    // Check if school exists
    const schoolCheck = await pool.query('SELECT id FROM schools WHERE id = $1', [school_id]);
    if (schoolCheck.rows.length === 0) {
      return res.status(404).json({ message: 'المجمع غير موجود' });
    }

    // Check if semester already exists for this school
    const existingResult = await pool.query(
      'SELECT id FROM semesters WHERE school_id = $1 AND type = $2 AND year = $3',
      [school_id, type, year]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ message: 'الفصل الدراسي موجود بالفعل لهذا المجمع والعام' });
    }

    const result = await pool.query(
      'INSERT INTO semesters (school_id, type, year, start_date, end_date, display_name, weekend_days, vacation_days, registration_open, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *',
      [school_id, type, year, start_date, end_date, display_name, JSON.stringify(weekend_days || [5, 6]), JSON.stringify(vacation_days || []), Boolean(registration_open)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating semester:', error);
    res.status(500).json({ message: 'خطأ في إنشاء الفصل الدراسي' });
  }
});

// Update semester
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'administrator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل الفصل الدراسي' });
    }

    const { id } = req.params;
    const { type, year, start_date, end_date, display_name, school_id, weekend_days, vacation_days, registration_open = false } = req.body;

    // Verify the user can access the EXISTING semester before editing it.
    // Prevents an administrator from hijacking another school's semester.
    const existingSemester = await pool.query('SELECT school_id FROM semesters WHERE id = $1', [id]);
    if (existingSemester.rows.length === 0) {
      return res.status(404).json({ message: 'الفصل الدراسي غير موجود' });
    }
    if (!(await canAccessSchool(pool, req.user, existingSemester.rows[0].school_id))) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل هذا الفصل الدراسي' });
    }

    // If school_id is provided, validate it
    if (school_id) {
      if (!(await canAccessSchool(pool, req.user, school_id))) {
        return res.status(403).json({ message: 'Access denied for this school' });
      }
      const schoolCheck = await pool.query('SELECT id FROM schools WHERE id = $1', [school_id]);
      if (schoolCheck.rows.length === 0) {
        return res.status(404).json({ message: 'المجمع غير موجود' });
      }
      
      // Check if semester with same type/year already exists for this school (excluding current semester)
      const existingResult = await pool.query(
        'SELECT id FROM semesters WHERE school_id = $1 AND type = $2 AND year = $3 AND id != $4',
        [school_id, type, year, id]
      );
      
      if (existingResult.rows.length > 0) {
        return res.status(400).json({ message: 'الفصل الدراسي موجود بالفعل لهذا المجمع والعام' });
      }
    }

    const result = await pool.query(
      'UPDATE semesters SET type = $1, year = $2, start_date = $3, end_date = $4, display_name = $5, school_id = $6, weekend_days = $7, vacation_days = $8, registration_open = $9, updated_at = NOW() WHERE id = $10 RETURNING *',
      [type, year, start_date, end_date, display_name, school_id, JSON.stringify(weekend_days || [5, 6]), JSON.stringify(vacation_days || []), Boolean(registration_open), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الفصل الدراسي غير موجود' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating semester:', error);
    res.status(500).json({ message: 'خطأ في تحديث الفصل الدراسي' });
  }
});

// Get students registered in a semester before/after class assignment
router.get('/:id/registrations', auth, async (req, res) => {
  try {
    if (!STAFF_REGISTRATION_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'غير مسموح لك بعرض قائمة المسجلين' });
    }

    const { id } = req.params;
    const { class_id, unassigned_only } = req.query;
    const access = await getSemesterWithAccess(req, id, true);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const params = [id];
    let extraWhere = '';

    if (req.user.role === 'teacher') {
      if (!class_id) {
        return res.status(400).json({ message: 'يجب تحديد الحلقة للمعلم' });
      }
      if (!(await teacherCanAssignRegisteredStudents(req.user.id))) {
        return res.status(403).json({ message: 'صلاحية إضافة الطلاب من قائمة التسجيل غير مفعلة لهذا المعلم' });
      }
      if (!(await canAccessClass(pool, req.user, class_id))) {
        return res.status(403).json({ message: 'غير مسموح لك بهذه الحلقة' });
      }
      extraWhere += ` AND sr.class_id IS NULL`;
    } else if (class_id) {
      if (!(await canAccessClass(pool, req.user, class_id))) {
        return res.status(403).json({ message: 'غير مسموح لك بهذه الحلقة' });
      }
      if (unassigned_only === 'true') {
        extraWhere += ` AND sr.class_id IS NULL`;
      } else {
        params.push(class_id);
        extraWhere += ` AND (sr.class_id IS NULL OR sr.class_id = $2)`;
      }
    }

    const result = await pool.query(
      `SELECT
         sr.id,
         sr.semester_id,
         sr.student_id,
         sr.class_id,
         sr.status,
         sr.created_at,
         u.first_name,
         u.second_name,
         u.third_name,
         u.last_name,
         u.email,
         u.phone,
         s.school_level,
         c.name as class_name,
         rb.first_name as registered_by_first_name,
         rb.last_name as registered_by_last_name
       FROM semester_registrations sr
       JOIN users u ON sr.student_id = u.id
       JOIN students s ON sr.student_id = s.id
       LEFT JOIN classes c ON sr.class_id = c.id
       LEFT JOIN users rb ON sr.registered_by = rb.id
       WHERE sr.semester_id = $1
       ${extraWhere}
       ORDER BY sr.class_id NULLS FIRST, sr.created_at DESC`,
      params
    );

    res.json({ registrations: result.rows });
  } catch (error) {
    console.error('Error fetching semester registrations:', error);
    res.status(500).json({ message: 'خطأ في جلب قائمة المسجلين' });
  }
});

// Register the current student, a parent's child, or an admin-selected student in a semester.
router.post('/:id/register', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.body.student_id || req.user.id;
    const { school_level } = req.body;

    if (!(await canRegisterStudent(req, studentId))) {
      return res.status(403).json({ message: 'غير مسموح لك بتسجيل هذا الطالب' });
    }

    const semesterResult = await pool.query(
      'SELECT id, registration_open FROM semesters WHERE id = $1',
      [id]
    );

    const semester = semesterResult.rows[0];
    if (!semester) {
      return res.status(404).json({ message: 'الفصل الدراسي غير موجود' });
    }

    if (!semester.registration_open && !['admin', 'administrator', 'supervisor'].includes(req.user.role)) {
      return res.status(400).json({ message: 'التسجيل غير متاح لهذا الفصل حالياً' });
    }

    const studentResult = await pool.query('SELECT id FROM students WHERE id = $1', [studentId]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'الطالب غير موجود' });
    }

    if (!school_level || !String(school_level).trim()) {
      return res.status(400).json({ message: 'يجب تحديد المستوى الدراسي للطالب' });
    }

    await pool.query(
      'UPDATE students SET school_level = $1 WHERE id = $2',
      [String(school_level).trim(), studentId]
    );

    await pool.query(
      `UPDATE students
       SET target_surah_id = NULL,
           target_ayah_number = NULL
       WHERE id = $1
         AND NOT EXISTS (
           SELECT 1
           FROM semester_registrations
           WHERE student_id = $1
             AND semester_id = $2
         )`,
      [studentId, id]
    );

    const result = await pool.query(
      `INSERT INTO semester_registrations (semester_id, student_id, registered_by, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'registered', NOW(), NOW())
       ON CONFLICT (semester_id, student_id)
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [id, studentId, req.user.id]
    );

    res.status(201).json({
      message: 'تم تسجيل الطالب في الفصل بنجاح',
      registration: result.rows[0]
    });
  } catch (error) {
    console.error('Error registering student in semester:', error);
    res.status(500).json({ message: 'خطأ في تسجيل الطالب في الفصل' });
  }
});

// Assign a semester-registered student to a class.
router.patch('/:id/registrations/:studentId/class', auth, requireFeature('assign_student_class'), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!STAFF_REGISTRATION_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'غير مسموح لك بتسكين الطلاب' });
    }

    const { id, studentId } = req.params;
    const { class_id } = req.body;

    if (!class_id) {
      return res.status(400).json({ message: 'يجب اختيار الحلقة' });
    }

    const access = await getSemesterWithAccess(req, id, true);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    if (!(await canAccessClass(pool, req.user, class_id))) {
      return res.status(403).json({ message: 'غير مسموح لك بهذه الحلقة' });
    }

    if (req.user.role === 'teacher' && !(await teacherCanAssignRegisteredStudents(req.user.id))) {
      return res.status(403).json({ message: 'صلاحية إضافة الطلاب من قائمة التسجيل غير مفعلة لهذا المعلم' });
    }

    const classResult = await pool.query(
      'SELECT id, semester_id FROM classes WHERE id = $1',
      [class_id]
    );
    const selectedClass = classResult.rows[0];
    if (!selectedClass) {
      return res.status(404).json({ message: 'الحلقة غير موجودة' });
    }
    if (String(selectedClass.semester_id) !== String(id)) {
      return res.status(400).json({ message: 'الحلقة لا تتبع هذا الفصل الدراسي' });
    }

    await client.query('BEGIN');

    const registrationResult = await client.query(
      `UPDATE semester_registrations
       SET class_id = $1, status = 'assigned', updated_at = NOW()
       WHERE semester_id = $2 AND student_id = $3
       RETURNING *`,
      [class_id, id, studentId]
    );

    if (registrationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'الطالب غير مسجل في هذا الفصل' });
    }

    await client.query(
      `UPDATE student_enrollments se
       SET status = 'dropped', completion_date = NOW()
       FROM classes c
       WHERE se.class_id = c.id
         AND c.semester_id = $1
         AND se.student_id = $2
         AND se.class_id <> $3
         AND se.status = 'enrolled'`,
      [id, studentId, class_id]
    );

    const enrollmentResult = await client.query(
      `INSERT INTO student_enrollments (student_id, class_id, enrollment_date, status)
       VALUES ($1, $2, NOW(), 'enrolled')
       ON CONFLICT (student_id, class_id)
       DO UPDATE SET status = 'enrolled', enrollment_date = NOW(), completion_date = NULL
       RETURNING *`,
      [studentId, class_id]
    );

    await client.query(
      `UPDATE students
       SET status = 'active',
           target_surah_id = NULL,
           target_ayah_number = NULL
       WHERE id = $1`,
      [studentId]
    );

    await client.query(
      'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1',
      [studentId]
    );

    await client.query('COMMIT');

    res.json({
      message: 'تم تسكين الطالب في الحلقة بنجاح',
      registration: registrationResult.rows[0],
      enrollment: enrollmentResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning registered student to class:', error);
    res.status(500).json({ message: 'خطأ في تسكين الطالب في الحلقة' });
  } finally {
    client.release();
  }
});

// Cancel a student's registration in a semester (and drop them from any class
// of that semester). Controlled by the feature-privileges table.
router.delete('/:id/registrations/:studentId', auth, requireFeature('unregister_student_semester'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, studentId } = req.params;

    const access = await getSemesterWithAccess(req, id, true);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    await client.query('BEGIN');

    const registrationResult = await client.query(
      `UPDATE semester_registrations
       SET status = 'cancelled', class_id = NULL, updated_at = NOW()
       WHERE semester_id = $1 AND student_id = $2 AND status <> 'cancelled'
       RETURNING *`,
      [id, studentId]
    );

    if (registrationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'الطالب غير مسجل في هذا الفصل الدراسي' });
    }

    await client.query(
      `UPDATE student_enrollments se
       SET status = 'dropped', completion_date = NOW()
       FROM classes c
       WHERE se.class_id = c.id
         AND c.semester_id = $1
         AND se.student_id = $2
         AND se.status = 'enrolled'`,
      [id, studentId]
    );

    await client.query('COMMIT');
    res.json({ message: 'تم إلغاء تسجيل الطالب في الفصل الدراسي' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error cancelling semester registration:', error);
    res.status(500).json({ message: 'خطأ في إلغاء تسجيل الطالب' });
  } finally {
    client.release();
  }
});

// Delete semester
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف الفصل الدراسي' });
    }

    const { id } = req.params;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete grades first
      await client.query('DELETE FROM grades WHERE semester_id = $1', [id]);
      
      // Delete courses
      await client.query('DELETE FROM semester_courses WHERE semester_id = $1', [id]);
      
      // Delete semester
      const result = await client.query('DELETE FROM semesters WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'الفصل الدراسي غير موجود' });
      }

      await client.query('COMMIT');
      res.json({ message: 'تم حذف الفصل الدراسي بنجاح' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting semester:', error);
    res.status(500).json({ message: 'خطأ في حذف الفصل الدراسي' });
  }
});

// Get courses for a semester and school (backward compatibility)
router.get('/:id/courses/:schoolId', auth, async (req, res) => {
  try {
    const { id: semesterId, schoolId } = req.params;
    if (!(await canAccessSchool(pool, req.user, schoolId)) && !['teacher', 'student', 'parent', 'parent_student'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access denied for this school' });
    }
    
    const result = await pool.query(
      'SELECT * FROM semester_courses WHERE semester_id = $1 AND school_id = $2 AND class_id IS NULL ORDER BY name',
      [semesterId, schoolId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching semester courses:', error);
    res.status(500).json({ message: 'خطأ في جلب مقررات الفصل الدراسي' });
  }
});

// Get courses for a class in a semester
router.get('/:id/classes/:classId/courses', auth, async (req, res) => {
  try {
    const { id: semesterId, classId } = req.params;
    if (!(await canAccessClass(pool, req.user, classId))) {
      return res.status(403).json({ message: 'Access denied for this class' });
    }
    
    const result = await pool.query(
      `
      SELECT DISTINCT ON (name) *
      FROM semester_courses
      WHERE semester_id = $1
        AND (
          class_id = $2
          OR (
            class_id IS NULL
            AND school_id = (SELECT school_id FROM classes WHERE id = $2)
          )
        )
      ORDER BY name, CASE WHEN class_id = $2 THEN 0 ELSE 1 END
      `,
      [semesterId, classId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching class courses:', error);
    res.status(500).json({ message: 'خطأ في جلب مقررات الحلقة' });
  }
});

// Create course for semester (backward compatibility)
router.post('/:id/courses', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'administrator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لإنشاء مقرر' });
    }

    const { id: semesterId } = req.params;
    const { name, percentage, requires_surah, description, school_id, class_id, grade_type } = req.body;
    if (class_id) {
      if (!(await canAccessClass(pool, req.user, class_id))) {
        return res.status(403).json({ message: 'Access denied for this class' });
      }
    } else if (!(await canAccessSchool(pool, req.user, school_id))) {
      return res.status(403).json({ message: 'Access denied for this school' });
    }

    const result = await pool.query(
      'INSERT INTO semester_courses (semester_id, school_id, class_id, name, percentage, requires_surah, description, grade_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *',
      [semesterId, school_id, class_id, name, percentage, requires_surah, description, grade_type || 'other']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'خطأ في إنشاء المقرر' });
  }
});

// Create course for a specific class
router.post('/:id/classes/:classId/courses', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'administrator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لإنشاء مقرر' });
    }

    const { id: semesterId, classId } = req.params;
    const { name, percentage, requires_surah, description, grade_type } = req.body;
    if (!(await canAccessClass(pool, req.user, classId))) {
      return res.status(403).json({ message: 'Access denied for this class' });
    }

    // Get class info to determine school_id
    const classResult = await pool.query('SELECT school_id FROM classes WHERE id = $1', [classId]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ message: 'الحلقة غير موجودة' });
    }

    const result = await pool.query(
      'INSERT INTO semester_courses (semester_id, school_id, class_id, name, percentage, requires_surah, description, grade_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *',
      [semesterId, classResult.rows[0].school_id, classId, name, percentage, requires_surah, description, grade_type || 'other']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating class course:', error);
    res.status(500).json({ message: 'خطأ في إنشاء مقرر الحلقة' });
  }
});

module.exports = router;
