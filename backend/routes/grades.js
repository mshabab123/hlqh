const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');

// Initialize semester_attendance table if it doesn't exist
const initializeSemesterAttendanceTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS semester_attendance (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(10) NOT NULL,
        semester_id INTEGER NOT NULL,
        class_id UUID NOT NULL,
        attendance_date DATE NOT NULL,
        is_present BOOLEAN DEFAULT FALSE,
        is_explicit BOOLEAN DEFAULT FALSE,
        has_grade BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE(student_id, semester_id, class_id, attendance_date)
      )
    `);
    
    // Test if table exists and has the right structure
    const testResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'semester_attendance' 
      ORDER BY ordinal_position
    `);
  } catch (error) {
    console.error('Error initializing semester attendance table:', error);
  }
};

// Initialize table on module load
initializeSemesterAttendanceTable();

// Function to update semester attendance table when grade is entered
const updateSemesterAttendance = async (studentId, semesterId, classId, markedBy) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    
    // Insert or update attendance record in semester_attendance table
    const result = await pool.query(`
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
      RETURNING *
    `, [studentId, semesterId, classId, today]);
    
    
    // Also check what records exist for this student
    const checkResult = await pool.query(`
      SELECT * FROM semester_attendance 
      WHERE student_id = $1 AND semester_id = $2 
      ORDER BY attendance_date DESC 
      LIMIT 3
    `, [studentId, semesterId]);
    
  } catch (error) {
    console.error('❌ Error in updateSemesterAttendance:', error);
    console.error('❌ Error details:', error.message);
    throw error;
  }
};

// Function to automatically mark attendance when a grade is entered
const markAttendanceForGradeEntry = async (studentId, semesterId, markedBy) => {
  try {
    // Get the student's class
    const classResult = await pool.query(`
      SELECT c.id as class_id 
      FROM students s
      JOIN student_enrollments se ON s.id = se.student_id
      JOIN classes c ON se.class_id = c.id
      WHERE s.id = $1 AND se.status = 'enrolled'
      ORDER BY se.enrollment_date DESC
      LIMIT 1
    `, [studentId]);
    
    if (classResult.rows.length === 0) {
      throw new Error('Student class not found');
    }
    
    const classId = classResult.rows[0].class_id;
    
    // Get semester dates to find today's session
    const semesterResult = await pool.query(`
      SELECT start_date, end_date 
      FROM semesters 
      WHERE id = $1
    `, [semesterId]);
    
    if (semesterResult.rows.length === 0) {
      throw new Error('Semester not found');
    }
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const semesterStart = semesterResult.rows[0].start_date;
    const semesterEnd = semesterResult.rows[0].end_date;
    
    // Check if today is within the semester
    if (today < semesterStart || today > semesterEnd) {
      return;
    }
    
    // Find or create today's session for this class
    let sessionResult = await pool.query(`
      SELECT id FROM class_sessions 
      WHERE class_id = $1 AND session_date = $2
    `, [classId, today]);
    
    let sessionId;
    
    if (sessionResult.rows.length === 0) {
      // Create a session for today if it doesn't exist
      // Try to get class schedule for today's day of week
      const dayOfWeek = new Date(today).getDay(); // 0=Sunday, 1=Monday, etc.
      
      const scheduleResult = await pool.query(`
        SELECT start_time, end_time 
        FROM class_schedules 
        WHERE class_id = $1 AND day_of_week = $2 AND is_active = true
        LIMIT 1
      `, [classId, dayOfWeek]);
      
      let startTime = '09:00';
      let endTime = '11:00';
      
      if (scheduleResult.rows.length > 0) {
        startTime = scheduleResult.rows[0].start_time;
        endTime = scheduleResult.rows[0].end_time;
      }
      
      // Create the session
      const newSessionResult = await pool.query(`
        INSERT INTO class_sessions (class_id, session_date, start_time, end_time, status, created_by, notes)
        VALUES ($1, $2, $3, $4, 'completed', $5, 'Auto-created for grade entry')
        RETURNING id
      `, [classId, today, startTime, endTime, markedBy]);
      
      sessionId = newSessionResult.rows[0].id;
    } else {
      sessionId = sessionResult.rows[0].id;
    }
    
    // Mark attendance as present (or update existing record)
    await pool.query(`
      INSERT INTO attendance_records (session_id, student_id, status, marked_by, notes, is_manual, grade_based)
      VALUES ($1, $2, 'present', $3, 'Auto-marked based on grade entry', false, true)
      ON CONFLICT (session_id, student_id) 
      DO UPDATE SET 
        status = CASE 
          WHEN attendance_records.status = 'absent_unexcused' THEN 'present'
          ELSE attendance_records.status 
        END,
        grade_based = true,
        updated_at = CURRENT_TIMESTAMP
    `, [sessionId, studentId, markedBy]);
    
    
  } catch (error) {
    console.error('Error in markAttendanceForGradeEntry:', error);
    throw error;
  }
};

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
    const scores = result.rows.filter(g => g.score).map(g => parseFloat(g.score));
    const averageGrade = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    // Calculate completed pages (if available)
    const completedPages = result.rows.filter(g => g.pages_covered).reduce((sum, g) => sum + (g.pages_covered || 0), 0);
    
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
          date_graded = $7,
          updated_at = NOW()
        WHERE student_id = $8 AND course_id = $9 AND semester_id = $10
        RETURNING *
      `, [gradeValue, max_grade || 100, class_id, startRef, endRef, notes, grade_date || new Date().toISOString().split('T')[0], student_id, course_id, semester_id]);
    } else {
      // Create new grade
      result = await pool.query(`
        INSERT INTO grades (
          student_id, course_id, semester_id, class_id, grade_value, max_grade,
          grade_type, start_reference, end_reference, notes, date_graded, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) RETURNING *
      `, [student_id, course_id, semester_id, class_id, gradeValue, max_grade || 100, grade_type || 'test', startRef, endRef, notes, grade_date || new Date().toISOString().split('T')[0]]);
    }

    // Automatically mark attendance as present when grade is entered
    // This implements the automatic absence calculation system
  
    
    try {
      await markAttendanceForGradeEntry(student_id, semester_id, req.user.id);
      
      await updateSemesterAttendance(student_id, semester_id, class_id, req.user.id);
      
    } catch (attendanceError) {
      console.error('❌ ERROR: Failed to auto-mark attendance:', attendanceError);
      // Don't fail the grade entry if attendance marking fails
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
        date_graded = $7,
        updated_at = NOW()
      WHERE id = $8 RETURNING *
    `, [gradeValue, max_grade || 100, class_id, startRef, endRef, notes, grade_date || new Date().toISOString().split('T')[0], id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الدرجة غير موجودة' });
    }

    // Get the grade details to mark attendance
    const gradeDetails = await pool.query(`
      SELECT student_id, semester_id, class_id FROM grades WHERE id = $1
    `, [id]);

    if (gradeDetails.rows.length > 0) {
      try {
        await markAttendanceForGradeEntry(
          gradeDetails.rows[0].student_id, 
          gradeDetails.rows[0].semester_id, 
          req.user.id
        );
        
        // Also update the semester_attendance table directly
        await updateSemesterAttendance(
          gradeDetails.rows[0].student_id, 
          gradeDetails.rows[0].semester_id, 
          gradeDetails.rows[0].class_id, 
          req.user.id
        );
      } catch (attendanceError) {
        console.warn('Warning: Failed to auto-mark attendance on grade update:', attendanceError);
      }
    }

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
    if (!['admin', 'administrator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف الدرجات' });
    }

    const { id } = req.params;
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