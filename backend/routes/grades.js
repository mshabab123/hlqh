const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');




// Get grades for a semester and class
router.get('/semester/:semesterId/class/:classId', auth, async (req, res) => {
  try {
    const { semesterId, classId } = req.params;
    
    // If user is a teacher, verify they are assigned to this class
    if (req.user.role === 'teacher') {
      const teacherClassResult = await pool.query(
        'SELECT id FROM teacher_class_assignments WHERE teacher_id = $1 AND class_id = $2 AND is_active = true',
        [req.user.id, classId]
      );
      
      if (teacherClassResult.rows.length === 0) {
        return res.status(403).json({ message: 'ليس لديك صلاحية لعرض درجات هذه الحلقة' });
      }
    }
    
    const result = await pool.query(`
      SELECT g.*, u.first_name, u.last_name, c.name as course_name
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN users u ON s.id = u.id
      JOIN semester_courses c ON g.course_id = c.id
      JOIN student_enrollments se ON s.id = se.student_id
      WHERE g.class_id = $2 AND se.class_id = $2 AND se.status = 'enrolled'
        AND (g.semester_id = $1 OR g.semester_id IS NULL)
      ORDER BY u.first_name, u.last_name, c.name
    `, [semesterId, classId]);
    
    // Parse the references for frontend compatibility
    const grades = result.rows.map(grade => {
      const parsed = { ...grade };
      
      // Parse start_reference (format: "surah:ayah")
      if (grade.start_reference) {
        const [fromSurah, fromAyah] = grade.start_reference.split(':');
        parsed.from_surah = fromSurah;
        parsed.from_ayah = parseInt(fromAyah) || 1;
      }
      
      // Parse end_reference (format: "surah:ayah" or "surah:end")
      if (grade.end_reference) {
        const [toSurah, toAyah] = grade.end_reference.split(':');
        parsed.to_surah = toSurah;
        // If toAyah is 'end', we'll leave it for frontend to determine the max
        parsed.to_ayah = toAyah === 'end' ? null : (parseInt(toAyah) || 1);
      }
      
      // Also include score for backward compatibility
      parsed.score = grade.grade_value;
      
      return parsed;
    });
    
    res.json(grades);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ message: 'خطأ في جلب الدرجات' });
  }
});

// Get all grades for a student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { limit = 30 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        g.*,
        TO_CHAR(g.date_graded, 'YYYY-MM-DD') as date,
        c.name as course_name,
        c.percentage,
        c.requires_surah,
        cl.name as class_name,
        s.display_name as semester_name
      FROM grades g
      LEFT JOIN semester_courses c ON g.course_id = c.id
      LEFT JOIN classes cl ON g.class_id = cl.id
      LEFT JOIN semesters s ON g.semester_id = s.id
      WHERE g.student_id = $1
      ORDER BY g.date_graded DESC, g.created_at DESC
      LIMIT $2
    `, [studentId, limit]);
    
    // Calculate average grade
    const scores = result.rows.map((grade) => {
      if (grade.score !== undefined && grade.score !== null) {
        return parseFloat(grade.score);
      }
      if (grade.grade_value !== undefined && grade.grade_value !== null) {
        if (grade.max_grade) {
          return Math.round((parseFloat(grade.grade_value) / parseFloat(grade.max_grade)) * 100);
        }
        return parseFloat(grade.grade_value);
      }
      return null;
    }).filter((score) => Number.isFinite(score));
    const averageGrade = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    // Calculate completed pages (if available)
    const completedPages = result.rows.reduce((sum, grade) => {
      return sum + (grade.pages_covered || grade.pages || 0);
    }, 0);
    
    res.json({
      grades: result.rows,
      averageGrade,
      completedPages,
      totalGrades: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ message: 'خطأ في جلب درجات الطالب' });
  }
});

// Get student's grades for a semester
router.get('/student/:studentId/semester/:semesterId', auth, async (req, res) => {
  try {
    const { studentId, semesterId } = req.params;
    
    // If user is a teacher, verify the student is in their assigned classes
    if (req.user.role === 'teacher') {
      const studentInTeacherClassResult = await pool.query(`
        SELECT se.id FROM student_enrollments se
        JOIN teacher_class_assignments tca ON se.class_id = tca.class_id
        WHERE se.student_id = $1 AND tca.teacher_id = $2 AND tca.is_active = true AND se.status = 'enrolled'
      `, [studentId, req.user.id]);
      
      if (studentInTeacherClassResult.rows.length === 0) {
        return res.status(403).json({ message: 'ليس لديك صلاحية لعرض درجات هذا الطالب' });
      }
    }
    
    const result = await pool.query(`
      SELECT g.*, c.name as course_name, c.percentage, c.requires_surah
      FROM grades g
      JOIN semester_courses c ON g.course_id = c.id
      WHERE g.student_id = $1 AND g.semester_id = $2
      ORDER BY c.name
    `, [studentId, semesterId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ message: 'خطأ في جلب درجات الطالب' });
  }
});

// Create or update grade
router.post('/', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'administrator', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لإدخال الدرجات' });
    }

    const {
      student_id,
      course_id,
      semester_id,
      class_id,
      score,
      from_surah,
      from_ayah,
      to_surah,
      to_ayah,
      notes,
      // Also accept new format fields
      grade_value,
      max_grade,
      grade_type,
      start_reference,
      end_reference,
      grade_date
    } = req.body;

    // If user is a teacher, verify they are assigned to the class
    if (req.user.role === 'teacher') {
      const teacherClassResult = await pool.query(
        'SELECT id FROM teacher_class_assignments WHERE teacher_id = $1 AND class_id = $2 AND is_active = true',
        [req.user.id, class_id]
      );
      
      if (teacherClassResult.rows.length === 0) {
        return res.status(403).json({ message: 'ليس لديك صلاحية لتدريس هذه الحلقة' });
      }

      // Also verify the student is in the teacher's class
      const studentClassResult = await pool.query(
        'SELECT id FROM student_enrollments WHERE student_id = $1 AND class_id = $2 AND status = $3',
        [student_id, class_id, 'enrolled']
      );
      
      if (studentClassResult.rows.length === 0) {
        return res.status(403).json({ message: 'هذا الطالب غير مسجل في حلقتك' });
      }
    }

    // Use the appropriate field values (support both old and new formats)
    const gradeValue = grade_value || score;
    
    // Handle default ayah values
    const fromAyahValue = from_ayah || 1; // Default to first ayah
    const toAyahValue = to_ayah || null; // Will be handled below if needed
    
    const startRef = start_reference || (from_surah ? `${from_surah}:${fromAyahValue}` : null);
    const endRef = end_reference || (to_surah ? `${to_surah}:${toAyahValue || 'end'}` : null);

    // Check if grade already exists
    const existingGrade = await pool.query(
      'SELECT id FROM grades WHERE student_id = $1 AND course_id = $2 AND semester_id = $3',
      [student_id, course_id, semester_id]
    );

    let result;
    if (existingGrade.rows.length > 0) {
      // Update existing grade
      result = await pool.query(`
        UPDATE grades SET
          grade_value = $1,
          max_grade = $2,
          class_id = $3,
          start_reference = $4,
          end_reference = $5,
          notes = $6,
          date_graded = $7
        WHERE student_id = $8 AND course_id = $9 AND semester_id = $10
        RETURNING *
      `, [gradeValue, max_grade || 100, class_id, startRef, endRef, notes, grade_date || new Date().toISOString(), student_id, course_id, semester_id]);
    } else {
      // Create new grade
      result = await pool.query(`
        INSERT INTO grades (
          student_id, course_id, semester_id, class_id, grade_value, max_grade,
          grade_type, start_reference, end_reference, notes, date_graded, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) RETURNING *
      `, [student_id, course_id, semester_id, class_id, gradeValue, max_grade || 100, grade_type || 'test', startRef, endRef, notes, grade_date || new Date().toISOString()]);
    }

  
    

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving grade:', error);
    res.status(500).json({ message: 'خطأ في حفظ الدرجة' });
  }
});

// Update grade
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'administrator', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل الدرجات' });
    }

    const { id } = req.params;
    const {
      score,
      from_surah,
      from_ayah,
      to_surah,
      to_ayah,
      notes,
      // Also accept new format fields
      grade_value,
      max_grade,
      class_id,
      start_reference,
      end_reference,
      grade_date
    } = req.body;

    // If user is a teacher, verify they can edit this grade
    if (req.user.role === 'teacher') {
      // First get the grade details to check class assignment
      const gradeDetails = await pool.query(`
        SELECT class_id, student_id FROM grades WHERE id = $1
      `, [id]);

      if (gradeDetails.rows.length === 0) {
        return res.status(404).json({ message: 'الدرجة غير موجودة' });
      }

      const existingClassId = gradeDetails.rows[0].class_id;
      const studentId = gradeDetails.rows[0].student_id;

      // Verify teacher is assigned to the existing class
      const teacherClassResult = await pool.query(
        'SELECT id FROM teacher_class_assignments WHERE teacher_id = $1 AND class_id = $2 AND is_active = true',
        [req.user.id, existingClassId]
      );

      if (teacherClassResult.rows.length === 0) {
        return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل درجات هذه الحلقة' });
      }

      // Verify the student is in the teacher's class
      const studentClassResult = await pool.query(
        'SELECT id FROM student_enrollments WHERE student_id = $1 AND class_id = $2 AND status = $3',
        [studentId, existingClassId, 'enrolled']
      );

      if (studentClassResult.rows.length === 0) {
        return res.status(403).json({ message: 'هذا الطالب غير مسجل في حلقتك' });
      }
    }

    // Use the appropriate field values (support both old and new formats)
    const gradeValue = grade_value || score;
    const startRef = start_reference || (from_surah && from_ayah ? `${from_surah}:${from_ayah}` : null);
    const endRef = end_reference || (to_surah && to_ayah ? `${to_surah}:${to_ayah}` : null);

    const result = await pool.query(`
      UPDATE grades SET
        grade_value = $1,
        max_grade = $2,
        class_id = $3,
        start_reference = $4,
        end_reference = $5,
        notes = $6,
        date_graded = $7
      WHERE id = $8 RETURNING *
    `, [gradeValue, max_grade || 100, class_id, startRef, endRef, notes, grade_date || new Date().toISOString(), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الدرجة غير موجودة' });
    }

    const gradeDetails = await pool.query(`
      SELECT student_id, semester_id, class_id FROM grades WHERE id = $1
    `, [id]);


    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ message: 'خطأ في تحديث الدرجة' });
  }
});

// Delete grade
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'administrator', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف الدرجات' });
    }

    const { id } = req.params;

    // If user is a teacher, verify they can delete this grade
    if (req.user.role === 'teacher') {
      // First get the grade details to check class assignment
      const gradeDetails = await pool.query(`
        SELECT class_id, student_id FROM grades WHERE id = $1
      `, [id]);

      if (gradeDetails.rows.length === 0) {
        return res.status(404).json({ message: 'الدرجة غير موجودة' });
      }

      const { class_id, student_id } = gradeDetails.rows[0];

      // Verify teacher is assigned to this class
      const teacherClassResult = await pool.query(
        'SELECT id FROM teacher_class_assignments WHERE teacher_id = $1 AND class_id = $2 AND is_active = true',
        [req.user.id, class_id]
      );

      if (teacherClassResult.rows.length === 0) {
        return res.status(403).json({ message: 'ليس لديك صلاحية لحذف درجات هذه الحلقة' });
      }

      // Verify the student is in the teacher's class
      const studentClassResult = await pool.query(
        'SELECT id FROM student_enrollments WHERE student_id = $1 AND class_id = $2 AND status = $3',
        [student_id, class_id, 'enrolled']
      );

      if (studentClassResult.rows.length === 0) {
        return res.status(403).json({ message: 'هذا الطالب غير مسجل في حلقتك' });
      }
    }

    const result = await pool.query('DELETE FROM grades WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الدرجة غير موجودة' });
    }

    res.json({ message: 'تم حذف الدرجة بنجاح' });
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ message: 'خطأ في حذف الدرجة' });
  }
});

// Get class grades summary
router.get('/class/:classId/semester/:semesterId/summary', auth, async (req, res) => {
  try {
    const { classId, semesterId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        s.id as student_id,
        u.first_name,
        u.last_name,
        COALESCE(SUM(g.grade_value * c.percentage / 100), 0) as total_score,
        COUNT(g.id) as graded_courses,
        (SELECT COUNT(*) FROM semester_courses WHERE semester_id = $1) as total_courses
      FROM students s
      JOIN users u ON s.id = u.id
      JOIN student_enrollments se ON s.id = se.student_id
      LEFT JOIN grades g ON s.id = g.student_id AND g.semester_id = $1
      LEFT JOIN semester_courses c ON g.course_id = c.id
      WHERE se.class_id = $2 AND se.status = 'enrolled' AND u.is_active = true
      GROUP BY s.id, u.first_name, u.last_name
      ORDER BY total_score DESC, u.first_name, u.last_name
    `, [semesterId, classId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grades summary:', error);
    res.status(500).json({ message: 'خطأ في جلب ملخص الدرجات' });
  }
});

module.exports = router;
