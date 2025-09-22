const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { body, validationResult } = require('express-validator');
const { calculateMemorizedPages, TOTAL_QURAN_PAGES, QURAN_SURAHS, getSurahIdFromName, getSurahNameFromId } = require('../../frontend/src/utils/quranData.js');

// Import authentication middleware
const { authenticateToken: requireAuth } = require('../middleware/auth');

// Helper functions are now imported from QuranData.js

// Function to update student's overall memorization progress
const updateStudentMemorizationProgress = async (studentId) => {
  try {
    
    // Get all memorization grades for this student, ordered by most recent first
    const grades = await db.query(`
      SELECT start_reference, end_reference, date_graded
      FROM grades 
      WHERE student_id = $1 
        AND start_reference IS NOT NULL 
        AND end_reference IS NOT NULL
        AND grade_type = 'memorization'
      ORDER BY date_graded DESC, created_at DESC
    `, [studentId]);
    
    if (grades.rows.length === 0) {
      return;
    }
    
    // Find the most advanced memorization point
    let maxSurahId = null;
    let maxAyah = 0;
    
    for (const grade of grades.rows) {
      const startRef = grade.start_reference.split(':');
      const endRef = grade.end_reference.split(':');
      
      if (startRef.length === 2 && endRef.length === 2) {
        const startSurahId = getSurahIdFromName(startRef[0]);
        const endSurahId = getSurahIdFromName(endRef[0]);
        const endAyah = parseInt(endRef[1]);
        
        if (startSurahId && endSurahId && endAyah) {
          // Lower surah ID means more advanced (البقرة=2 is more advanced than الناس=114)
          if (maxSurahId === null || endSurahId < maxSurahId || (endSurahId === maxSurahId && endAyah > maxAyah)) {
            maxSurahId = endSurahId;
            maxAyah = endAyah;
          }
        }
      }
    }
    
    // If no valid memorization found, don't update
    if (maxSurahId === null) {
      return;
    }
    
    // Update student's memorization progress
    const result = await db.query(`
      UPDATE students 
      SET memorized_surah_id = $1,
          memorized_ayah_number = $2,
          last_memorization_update = NOW()
      WHERE id = $3
      RETURNING memorized_surah_id, memorized_ayah_number
    `, [maxSurahId, maxAyah, studentId]);
    
    
  } catch (error) {
    console.error('Error updating memorization progress:', error);
  }
};

// Class validation rules
const classValidationRules = [
  body('name').notEmpty().withMessage('اسم الحلقة مطلوب'),
  body('school_id').isUUID().withMessage('معرف مجمع الحلقات مطلوب'),
  body('semester_id')
    .isInt({ min: 1 })
    .withMessage('معرف الفصل الدراسي مطلوب'),
  body('school_level').notEmpty().withMessage('المستوى الدراسي مطلوب'),
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
    const { school_id, semester_id, is_active } = req.query;
    
    // Get current user info to check role for teacher privileges
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    const userRole = userResult.rows[0]?.role;
    
    let query = `
      SELECT 
        c.id, c.name, c.max_students, c.room_number as teacher_id, c.school_level,
        c.is_active, c.created_at, c.school_id, c.semester_id,
        s.name as school_name,
        sem.display_name as semester_name,
        CASE WHEN u.id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name) ELSE NULL END as teacher_name,
        COALESCE(
          ARRAY_AGG(DISTINCT tca.teacher_id) FILTER (WHERE tca.teacher_id IS NOT NULL),
          ARRAY[]::VARCHAR[]
        ) as assigned_teacher_ids,
        COALESCE(
          ARRAY_AGG(DISTINCT CONCAT(tu.first_name, ' ', tu.last_name)) FILTER (WHERE tu.id IS NOT NULL),
          ARRAY[]::TEXT[]
        ) as assigned_teacher_names,
        COALESCE(
          ARRAY_AGG(DISTINCT jsonb_build_object('id', tca.teacher_id, 'name', CONCAT(tu.first_name, ' ', tu.last_name), 'role', tca.teacher_role)) 
          FILTER (WHERE tca.teacher_id IS NOT NULL),
          ARRAY[]::JSONB[]
        ) as teachers_with_roles
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.id
      LEFT JOIN semesters sem ON c.semester_id = sem.id
      LEFT JOIN users u ON c.room_number = u.id
      LEFT JOIN teacher_class_assignments tca ON c.id = tca.class_id AND tca.is_active = TRUE
      LEFT JOIN users tu ON tca.teacher_id = tu.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // If user is a teacher, only show their assigned classes
    if (userRole === 'teacher') {
      query += ` AND c.id IN (
        SELECT class_id FROM teacher_class_assignments 
        WHERE teacher_id = $${paramIndex} AND is_active = true
      )`;
      params.push(req.user.id);
      paramIndex++;
    }

    if (school_id) {
      query += ` AND c.school_id = $${paramIndex}`;
      params.push(school_id);
      paramIndex++;
    }

    if (semester_id) {
      query += ` AND c.semester_id = $${paramIndex}`;
      params.push(parseInt(semester_id));
      paramIndex++;
    }

    if (is_active !== undefined) {
      query += ` AND c.is_active = $${paramIndex}`;
      params.push(is_active);
      paramIndex++;
    }

    query += ` GROUP BY c.id, c.name, c.max_students, c.room_number, c.school_level, c.is_active, c.created_at, c.school_id, c.semester_id, s.name, sem.display_name, u.id, u.first_name, u.last_name`;
    query += ` ORDER BY c.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
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
        name, school_id, semester_id, school_level, max_students, room_number, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [name, school_id, req.body.semester_id, req.body.school_level || 'عام', max_students, teacher_id || null, is_active]);

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

// Get students in a class
router.get('/:id/students', requireAuth, async (req, res) => {
  try {
    const { id: classId } = req.params;
    
    const result = await db.query(`
      SELECT 
        s.id,
        u.first_name,
        u.second_name, 
        u.third_name,
        u.last_name,
        s.school_level,
        u.date_of_birth,
        u.phone,
        u.email,
        u.is_active,
        se.enrollment_date,
        se.status
      FROM students s
      JOIN student_enrollments se ON s.id = se.student_id
      JOIN users u ON s.id = u.id
      WHERE se.class_id = $1 AND (se.status = 'enrolled' OR se.status IS NULL)
      ORDER BY u.first_name, u.last_name
    `, [classId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching class students:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب طلاب الحلقة' });
  }
});

// Add student to class
router.post('/:id/students', requireAuth, async (req, res) => {
  try {
    const { id: classId } = req.params;
    const { student_id } = req.body;
    
    if (!student_id) {
      return res.status(400).json({ error: 'معرف الطالب مطلوب' });
    }
    
    // Check if student exists
    const studentCheck = await db.query('SELECT s.id FROM students s JOIN users u ON s.id = u.id WHERE s.id = $1', [student_id]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }
    
    // Check if class exists
    const classCheck = await db.query('SELECT id FROM classes WHERE id = $1', [classId]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }
    
    // Add student to class (use UPSERT to handle duplicates)
    const result = await db.query(`
      INSERT INTO student_enrollments (student_id, class_id, enrollment_date, status)
      VALUES ($1, $2, NOW(), 'enrolled')
      ON CONFLICT (student_id, class_id) 
      DO UPDATE SET status = 'enrolled', enrollment_date = NOW()
      RETURNING *
    `, [student_id, classId]);
    
    res.status(201).json({ 
      message: 'تم إضافة الطالب للحلقة بنجاح',
      enrollment: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error adding student to class:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة الطالب للحلقة' });
  }
});

// Remove student from class
router.delete('/:id/students/:studentId', requireAuth, async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;
    
    const result = await db.query(`
      UPDATE student_enrollments 
      SET status = 'dropped', completion_date = NOW()
      WHERE class_id = $1 AND student_id = $2 AND status = 'enrolled'
      RETURNING *
    `, [classId, studentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على الطالب في هذه الحلقة' });
    }
    
    res.json({ message: 'تم إزالة الطالب من الحلقة بنجاح' });
    
  } catch (error) {
    console.error('Error removing student from class:', error);
    res.status(500).json({ error: 'حدث خطأ في إزالة الطالب من الحلقة' });
  }
});

// Get available students (not in any class or in specific school)
router.get('/:id/available-students', requireAuth, async (req, res) => {
  try {
    const { id: classId } = req.params;
    
    // Get students not in this class
    const result = await db.query(`
      SELECT DISTINCT
        s.id,
        u.first_name,
        u.second_name,
        u.third_name, 
        u.last_name,
        s.school_level,
        u.date_of_birth,
        u.is_active,
        1 as priority
      FROM students s
      JOIN users u ON s.id = u.id
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.class_id = $1 AND se.status = 'enrolled'
      WHERE se.student_id IS NULL
        AND u.is_active = true
      ORDER BY u.first_name, u.last_name
      LIMIT 100
    `, [classId]);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الطلاب المتاحين' });
  }
});

// Get class with students and courses for grading
router.get('/:id/grading', requireAuth, async (req, res) => {
  try {
    const { id: classId } = req.params;
    
    // Get class info
    const classInfo = await db.query(`
      SELECT c.*, s.name as school_name, sem.display_name as semester_name
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.id
      LEFT JOIN semesters sem ON c.semester_id = sem.id
      WHERE c.id = $1
    `, [classId]);
    
    if (classInfo.rows.length === 0) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }
    
    // Get students in the class
    const students = await db.query(`
      SELECT 
        s.id,
        u.first_name,
        u.second_name, 
        u.third_name,
        u.last_name,
        s.school_level,
        se.enrollment_date,
        se.status
      FROM students s
      JOIN student_enrollments se ON s.id = se.student_id
      JOIN users u ON s.id = u.id
      WHERE se.class_id = $1 AND (se.status = 'enrolled' OR se.status IS NULL) AND sc.status = 'active'
      ORDER BY u.first_name, u.last_name
    `, [classId]);
    
    // Get courses for this class
    const courses = await db.query(`
      SELECT id, name, percentage, requires_surah, description
      FROM semester_courses
      WHERE class_id = $1 AND is_active = true
      ORDER BY name
    `, [classId]);
    
    // Get existing grades for all students and courses
    const grades = await db.query(`
      SELECT student_id, course_id, grade_type, grade_value, max_grade, notes, date_graded, created_at
      FROM grades
      WHERE class_id = $1
    `, [classId]);
    
    res.json({
      class: classInfo.rows[0],
      students: students.rows,
      courses: courses.rows,
      grades: grades.rows
    });
    
  } catch (error) {
    console.error('Error fetching class grading data:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب بيانات الدرجات' });
  }
});

// Add new grade entry (allows multiple grades per course)
router.post('/:id/grades', requireAuth, async (req, res) => {
  try {
    const { id: classId } = req.params;
    const { student_id, course_id, grade_type, grade_value, max_grade, notes, start_reference, end_reference, grade_date } = req.body;
    
    if (!student_id || !course_id || grade_value === undefined) {
      return res.status(400).json({ error: 'البيانات المطلوبة: معرف الطالب، معرف المادة، والدرجة' });
    }
    
    // Get class info to obtain semester_id
    const classInfo = await db.query('SELECT semester_id FROM classes WHERE id = $1', [classId]);
    if (classInfo.rows.length === 0) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }
    
    const semesterId = classInfo.rows[0].semester_id;
    
    // Always insert new grade (allow multiple entries per course) with semester_id
    const result = await db.query(`
      INSERT INTO grades (
        student_id, course_id, semester_id, class_id, grade_value, max_grade,
        grade_type, start_reference, end_reference, notes, date_graded
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [student_id, course_id, semesterId, classId, grade_value, max_grade || 100, grade_type || 'assignment', start_reference, end_reference, notes, grade_date || new Date().toISOString().split('T')[0]]);
    
    // If this is a memorization grade with Quran references, update student's overall progress
    if (start_reference && end_reference && grade_type === 'memorization') {
      await updateStudentMemorizationProgress(student_id);
    }
    
    // **MARK ATTENDANCE WHEN GRADE IS ENTERED**
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await db.query(`
        INSERT INTO semester_attendance (
          student_id, semester_id, class_id, attendance_date, 
          is_present, is_explicit, has_grade, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, true, false, true, 'Auto-marked based on grade entry', NOW(), NOW())
        ON CONFLICT (student_id, semester_id, class_id, attendance_date) 
        DO UPDATE SET 
          is_present = true,
          has_grade = true,
          notes = 'Auto-marked based on grade entry',
          updated_at = NOW()
      `, [student_id, semesterId, classId, today]);
      
    } catch (attendanceError) {
      console.error('❌ Failed to mark attendance from class grades:', attendanceError);
      // Don't fail the grade entry if attendance marking fails
    }
    
    res.json({ 
      message: 'تم حفظ الدرجة بنجاح',
      grade: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error saving grade:', error);
    res.status(500).json({ error: 'حدث خطأ في حفظ الدرجة' });
  }
});

// Get grades summary for a class
router.get('/:id/grades-summary', requireAuth, async (req, res) => {
  try {
    const { id: classId } = req.params;
    
    const result = await db.query(`
      SELECT 
        s.id as student_id,
        u.first_name,
        u.last_name,
        sc.name as course_name,
        sc.percentage as course_percentage,
        g.grade_value,
        g.max_grade,
        CASE 
          WHEN g.grade_value IS NOT NULL AND g.max_grade > 0 
          THEN ROUND((g.grade_value::decimal / g.max_grade) * 100, 2)
          ELSE NULL
        END as percentage_score
      FROM students s
      JOIN student_enrollments se ON s.id = se.student_id
      JOIN users u ON s.id = u.id
      CROSS JOIN semester_courses sc
      LEFT JOIN grades g ON s.id = g.student_id AND sc.id = g.course_id AND g.class_id = $1
      WHERE se.class_id = $1 AND se.status = 'enrolled' AND sc.class_id = $1 AND sc.is_active = true
      ORDER BY u.first_name, u.last_name, sc.name
    `, [classId]);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching grades summary:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب ملخص الدرجات' });
  }
});

// Update student goal (using target fields for consistency)
router.put('/:id/student/:studentId/goal', requireAuth, async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;
    const { target_surah_id, target_ayah_number } = req.body;
    
    
    // First check if student exists
    const studentCheck = await db.query('SELECT id FROM students WHERE id = $1', [studentId]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }
    
    const result = await db.query(`
      UPDATE students 
      SET target_surah_id = $1, 
          target_ayah_number = $2
      WHERE id = $3
      RETURNING target_surah_id, target_ayah_number
    `, [target_surah_id, target_ayah_number, studentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'فشل في تحديث الهدف' });
    }
    
    
    res.json({ 
      success: true, 
      goal: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Error updating student goal:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث الهدف: ' + error.message });
  }
});

// Get individual student profile with complete grade history
router.get('/:id/student/:studentId/profile', requireAuth, async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;
    
    // Get student information including memorization progress and goal
    const studentInfo = await db.query(`
      SELECT target_surah_id, target_ayah_number, memorized_surah_id, memorized_ayah_number
      FROM students
      WHERE id = $1
    `, [studentId]);
    
    // First get class information including semester_id
    const classInfo = await db.query(`
      SELECT id, semester_id, school_id
      FROM classes
      WHERE id = $1
    `, [classId]);
    
    if (classInfo.rows.length === 0) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }
    
    const classData = classInfo.rows[0];
    
    // Get class courses - prioritize class-specific courses, then semester-wide courses
    const courses = await db.query(`
      SELECT DISTINCT ON (name) id, name, percentage, requires_surah, description
      FROM semester_courses
      WHERE semester_id = $1 
        AND (class_id = $2 OR class_id IS NULL)
        AND (is_active IS NULL OR is_active = true)
      ORDER BY name, CASE WHEN class_id = $2 THEN 0 ELSE 1 END
    `, [classData.semester_id, classId]);
    
    // Get all grades for this student in this class
    const grades = await db.query(`
      SELECT g.*, sc.name as course_name
      FROM grades g
      LEFT JOIN semester_courses sc ON g.course_id = sc.id
      WHERE g.class_id = $1 AND g.student_id = $2
      ORDER BY g.date_graded DESC, g.created_at DESC
    `, [classId, studentId]);
    
    const studentData = studentInfo.rows[0] || {};
    
    // Calculate memorized pages
    const memorizedPages = calculateMemorizedPages(
      studentData.memorized_surah_id, 
      studentData.memorized_ayah_number
    );
    
    const pagesPercentage = memorizedPages > 0 ? 
      Math.round((memorizedPages / TOTAL_QURAN_PAGES) * 100 * 100) / 100 : 0;
    
    res.json({
      courses: courses.rows,
      grades: grades.rows,
      goal: studentData.target_surah_id ? {
        target_surah_id: studentData.target_surah_id,
        target_ayah_number: studentData.target_ayah_number
      } : null,
      memorized_surah_id: studentData.memorized_surah_id,
      memorized_ayah_number: studentData.memorized_ayah_number,
      memorized_pages: memorizedPages,
      total_pages: TOTAL_QURAN_PAGES,
      pages_percentage: pagesPercentage
    });
    
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب ملف الطالب' });
  }
});

// POST /api/classes/:id/teachers - Assign multiple teachers to class with primary/secondary roles
router.post('/:id/teachers', async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { teacher_ids = [], primary_teacher_id } = req.body; // Array of teacher IDs and optional primary teacher

    await client.query('BEGIN');

    // Check if class exists
    const classCheck = await client.query('SELECT id FROM classes WHERE id = $1', [id]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }

    // Remove all existing assignments for this class
    await client.query('DELETE FROM teacher_class_assignments WHERE class_id = $1', [id]);

    // Add new assignments
    if (teacher_ids.length > 0) {
      // Ensure we have at least one primary teacher
      const primaryId = primary_teacher_id || teacher_ids[0];
      
      for (let i = 0; i < teacher_ids.length; i++) {
        const teacherId = teacher_ids[i];
        
        // Verify teacher exists
        const teacherCheck = await client.query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
        if (teacherCheck.rows.length > 0) {
          // Determine if this is the primary teacher
          const isPrimary = teacherId === primaryId;
          const role = isPrimary ? 'primary' : 'secondary';
          
          await client.query(`
            INSERT INTO teacher_class_assignments (teacher_id, class_id, teacher_role)
            VALUES ($1, $2, $3)
            ON CONFLICT (teacher_id, class_id) DO UPDATE 
            SET teacher_role = $3, is_active = TRUE
          `, [teacherId, id, role]);
        }
      }
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: '✅ تم تحديث تعيينات المعلمين للحلقة بنجاح',
      classId: id,
      assignedTeachers: teacher_ids.length,
      primaryTeacher: primary_teacher_id || teacher_ids[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assign class teachers error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تعيين المعلمين للحلقة' });
  } finally {
    client.release();
  }
});

// GET /api/classes/:id/teachers - Get teachers assigned to class with their roles
router.get('/:id/teachers', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.is_active, u.role,
        tca.teacher_role, tca.is_active as assignment_active
      FROM teacher_class_assignments tca
      JOIN users u ON tca.teacher_id = u.id
      WHERE tca.class_id = $1 AND tca.is_active = TRUE AND u.role = 'teacher'
      ORDER BY 
        CASE WHEN tca.teacher_role = 'primary' THEN 0 ELSE 1 END,
        u.first_name, u.last_name
    `, [id]);

    res.json({ teachers: result.rows });

  } catch (err) {
    console.error('Get class teachers error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب معلمي الحلقة' });
  }
});

module.exports = router;