const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');

// Helper function to get working days for a semester
const getWorkingDays = (startDate, endDate, weekendDays = [4, 5, 6], vacationDays = []) => {
  const workingDays = [];

  // Extract date part from database dates (they come as YYYY-MM-DDTHH:MM:SS.sssZ)
  const startDateStr = startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate.split('T')[0];
  const endDateStr = endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate.split('T')[0];

  // Create date objects for iteration using local dates
  const currentDate = new Date(startDateStr + 'T12:00:00.000Z'); // Use noon UTC to avoid timezone issues
  const end = new Date(endDateStr + 'T12:00:00.000Z');

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const dateStr = currentDate.toISOString().split('T')[0];

    const isWeekend = weekendDays.includes(dayOfWeek);
    const isVacation = vacationDays.includes(dateStr);

    if (!isWeekend && !isVacation) {
      workingDays.push(dateStr);
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return workingDays;
};

// GET /api/attendance/student/:studentId
// Get attendance history for a specific student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Token missing' });
    }

    if (userRole === 'student' && userId !== studentId) {
      return res.status(403).json({ error: 'O§USOñ U.O3U.U^O- U,UŸ O"OU,U^OæU^U, OU,O-OU^Oñ U,OúOU,O" O›OrOñ' });
    }

    if (userRole === 'parent' || userRole === 'parent_student') {
      const parentCheck = await pool.query(
        'SELECT 1 FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
        [userId, studentId]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'O§USOñ U.O3U.U^O- U,UŸ O"OU,U^OæU^U, OU,O-OU^Oñ U,OúOU,O"' });
      }
    }

    if (userRole === 'teacher') {
      const teacherCheck = await pool.query(`
        SELECT 1
        FROM student_enrollments se
        JOIN teacher_class_assignments tca ON se.class_id = tca.class_id
        WHERE se.student_id = $1
          AND se.status = 'enrolled'
          AND tca.teacher_id = $2
          AND tca.teacher_role = 'primary'
          AND tca.is_active = true
      `, [studentId, userId]);

      if (teacherCheck.rows.length === 0) {
        return res.status(403).json({ error: 'O§USOñ U.O3U.U^O- U,UŸ O"OU,U^OæU^U, OU,O-OU^Oñ U,OúOU,O"' });
      }
    }

    const result = await pool.query(`
      SELECT
        TO_CHAR(sa.attendance_date, 'YYYY-MM-DD') as attendance_date,
        sa.is_present,
        sa.notes,
        c.name as class_name
      FROM semester_attendance sa
      LEFT JOIN classes c ON sa.class_id = c.id
      WHERE sa.student_id = $1
      ORDER BY sa.attendance_date DESC, sa.created_at DESC
    `, [studentId]);

    const totalCount = result.rows.length;
    const presentCount = result.rows.filter((row) => row.is_present).length;
    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    res.json({
      attendance: result.rows,
      percentage
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ error: 'Error fetching student attendance' });
  }
});

// GET /api/attendance/semester/:semesterId/class/:classId
// Get attendance data for all students in a class for the semester
router.get('/semester/:semesterId/class/:classId', auth, async (req, res) => {
  try {
    const { semesterId, classId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check permissions
    if (!['admin', 'administrator', 'teacher', 'supervisor'].includes(userRole)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذه البيانات' });
    }

    // For teachers, verify they can access this class
    if (userRole === 'teacher') {
      const teacherCheck = await pool.query(`
        SELECT 1 FROM teacher_class_assignments
        WHERE teacher_id = $1
          AND class_id = $2
          AND teacher_role = 'primary'
          AND is_active = true
      `, [userId, classId]);

      if (teacherCheck.rows.length === 0) {
        return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذه الحلقة' });
      }
    }

    // Get semester information
    const semesterResult = await pool.query(`
      SELECT id, display_name, start_date, end_date, weekend_days, vacation_days
      FROM semesters WHERE id = $1
    `, [semesterId]);

    if (semesterResult.rows.length === 0) {
      return res.status(404).json({ error: 'الفصل الدراسي غير موجود' });
    }

    const semester = semesterResult.rows[0];

    // PostgreSQL JSONB fields are automatically parsed by pg driver
    // Use semester configuration for weekend days: [4,5,6] = Thursday, Friday, Saturday
    const weekendDays = semester.weekend_days || [4, 5, 6];
    const vacationDays = semester.vacation_days || [];

    // Calculate working days based on semester configuration
    const workingDays = getWorkingDays(semester.start_date, semester.end_date, weekendDays, vacationDays);

    // Get all students in the class
    const studentsResult = await pool.query(`
      SELECT
        s.id as student_id,
        u.first_name,
        u.second_name,
        u.third_name,
        u.last_name
      FROM students s
      JOIN users u ON s.id = u.id
      JOIN student_enrollments se ON s.id = se.student_id
      WHERE se.class_id = $1 AND se.status = 'enrolled'
      ORDER BY u.first_name, u.last_name
    `, [classId]);

    // Get all attendance records for this class and semester
    const attendanceResult = await pool.query(`
      SELECT
        student_id,
        attendance_date,
        is_present,
        is_explicit,
        has_grade,
        notes
      FROM semester_attendance
      WHERE class_id = $1 AND semester_id = $2
    `, [classId, semesterId]);

    // Create attendance map for quick lookup
    const attendanceMap = {};
    attendanceResult.rows.forEach(record => {
      let dateStr;
      if (record.attendance_date instanceof Date) {
        // Use local date to avoid timezone issues
        const date = new Date(record.attendance_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      } else {
        dateStr = record.attendance_date.split('T')[0];
      }
      const key = `${record.student_id}_${dateStr}`;
      attendanceMap[key] = {
        ...record,
        attendance_date: dateStr
      };
    });

    // Get current date for auto-absent logic
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Build response data
    const students = studentsResult.rows.map(student => {
      const studentAttendance = workingDays.map(date => {
        const key = `${student.student_id}_${date}`;
        const record = attendanceMap[key];

        // Auto-mark as absent if day has passed and no explicit record exists
        let status = 'unknown';
        let isPresent = null;
        let isExplicit = false;

        if (record) {
          // Existing record
          status = record.is_present ? 'present' : 'absent';
          isPresent = record.is_present;
          isExplicit = record.is_explicit;
        } else if (date < today) {
          // Past day with no record - mark as absent
          status = 'absent';
          isPresent = false;
          isExplicit = false; // Auto-generated, not explicit
        }

        return {
          date: date,
          is_present: isPresent,
          is_explicit: isExplicit,
          has_grade: record ? record.has_grade : false,
          notes: record ? record.notes : null,
          status: status
        };
      });

      // Calculate statistics
      const totalDays = workingDays.length;
      const recordedDays = studentAttendance.filter(day => day.status !== 'unknown').length;
      const presentDays = studentAttendance.filter(day => day.is_present === true).length;
      const absentDays = studentAttendance.filter(day => day.is_present === false).length;
      const attendanceRate = recordedDays > 0 ? Math.round((presentDays / recordedDays) * 100) : 0;

      return {
        student_id: student.student_id,
        name: `${student.first_name} ${student.second_name || ''} ${student.third_name || ''} ${student.last_name}`.trim(),
        first_name: student.first_name,
        last_name: student.last_name,
        attendance: studentAttendance,
        statistics: {
          total_working_days: totalDays,
          recorded_days: recordedDays,
          present_days: presentDays,
          absent_days: absentDays,
          unrecorded_days: totalDays - recordedDays,
          attendance_rate: attendanceRate
        }
      };
    });

    // Add day names to working days
    const workingDaysWithNames = workingDays.map(date => {
      const dateObj = new Date(date);
      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const dayName = dayNames[dateObj.getDay()];

      return {
        date: date,
        day_name: dayName,
        formatted_date: dateObj.toLocaleDateString('ar-SA', {
          month: 'short',
          day: 'numeric'
        })
      };
    });

    res.json({
      semester: {
        id: semester.id,
        name: semester.display_name,
        start_date: semester.start_date,
        end_date: semester.end_date
      },
      working_days: workingDaysWithNames,
      students: students
    });

  } catch (error) {
    console.error('Error fetching attendance data:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'فشل في جلب بيانات الحضور', details: error.message });
  }
});

// POST /api/attendance/mark
// Mark attendance for a student on a specific date
router.post('/mark', auth, async (req, res) => {
  try {
    const { semester_id, class_id, student_id, attendance_date, is_present, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check permissions
    if (!['admin', 'administrator', 'teacher'].includes(userRole)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لتسجيل الحضور' });
    }

    // For teachers, verify they can access this class
    if (userRole === 'teacher') {
      const teacherCheck = await pool.query(`
        SELECT 1 FROM teacher_class_assignments
        WHERE teacher_id = $1
          AND class_id = $2
          AND teacher_role = 'primary'
          AND is_active = true
      `, [userId, class_id]);

      if (teacherCheck.rows.length === 0) {
        return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذه الحلقة' });
      }
    }

    // Insert or update attendance record
    const result = await pool.query(`
      INSERT INTO semester_attendance (
        semester_id, class_id, student_id, attendance_date,
        is_present, is_explicit, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
      ON CONFLICT (semester_id, class_id, student_id, attendance_date)
      DO UPDATE SET
        is_present = EXCLUDED.is_present,
        is_explicit = true,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `, [semester_id, class_id, student_id, attendance_date, is_present, notes]);

    res.json({
      success: true,
      message: `تم تسجيل ${is_present ? 'حضور' : 'غياب'} الطالب بنجاح`,
      record: result.rows[0]
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'فشل في تسجيل الحضور' });
  }
});

// GET /api/attendance/classes
// Get classes accessible by the current user
router.get('/classes', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT
        c.id, c.name, c.school_level, c.school_id,
        s.name as school_name,
        COUNT(DISTINCT se.student_id) as student_count
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.id
      LEFT JOIN student_enrollments se ON c.id = se.class_id AND se.status = 'enrolled'
    `;

    let whereClause = '';
    let params = [];

    switch (userRole) {
      case 'admin':
        whereClause = ' WHERE 1=1';
        break;

      case 'administrator':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM administrators WHERE id = $1
        )`;
        params = [userId];
        break;

      case 'supervisor':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM supervisors WHERE id = $1
        )`;
        params = [userId];
        break;

      case 'teacher':
        whereClause = ` WHERE c.id IN (
          SELECT class_id FROM teacher_class_assignments
          WHERE teacher_id = $1
            AND teacher_role = 'primary'
            AND is_active = true
        )`;
        params = [userId];
        break;

      default:
        return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذه البيانات' });
    }

    query += whereClause + ' GROUP BY c.id, c.name, c.school_level, c.school_id, s.name ORDER BY c.name';

    const result = await pool.query(query, params);
    res.json({ classes: result.rows });

  } catch (error) {
    console.error('Error fetching classes:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'فشل في جلب الحلقات', details: error.message });
  }
});

// POST /api/attendance/fix-dates
// Admin-only function to fix attendance dates to match grade dates
router.post('/fix-dates', auth, async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only admins can run this fix
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'فقط المدير العام يمكنه تشغيل هذه العملية' });
    }

    console.log('🔧 Admin fixing attendance dates...');

    // Step 1: Create attendance records for all grades that don't have them
    const insertResult = await pool.query(`
      INSERT INTO semester_attendance (
        semester_id, class_id, student_id, attendance_date,
        is_present, is_explicit, has_grade, notes, created_at, updated_at
      )
      SELECT DISTINCT
        g.semester_id,
        g.class_id,
        g.student_id,
        g.date_graded,
        true,
        true,
        true,
        'Auto-marked based on grade entry',
        NOW(),
        NOW()
      FROM grades g
      LEFT JOIN semester_attendance sa ON (
        sa.student_id = g.student_id
        AND sa.class_id = g.class_id
        AND sa.semester_id = g.semester_id
        AND sa.attendance_date = g.date_graded
      )
      WHERE sa.id IS NULL
      ON CONFLICT (semester_id, class_id, student_id, attendance_date)
      DO UPDATE SET
        has_grade = true,
        is_present = true,
        is_explicit = true,
        notes = 'Auto-marked based on grade entry',
        updated_at = NOW();
    `);

    // Step 2: Remove old incorrect attendance records that were auto-generated with wrong dates
    const deleteResult = await pool.query(`
      DELETE FROM semester_attendance
      WHERE has_grade = true
        AND notes = 'Auto-marked based on grade entry'
        AND NOT EXISTS (
          SELECT 1 FROM grades g
          WHERE g.student_id = semester_attendance.student_id
            AND g.class_id = semester_attendance.class_id
            AND g.semester_id = semester_attendance.semester_id
            AND g.date_graded = semester_attendance.attendance_date
        );
    `);

    // Step 3: Mark existing attendance records that match grade dates
    const markGradesResult = await pool.query(`
      UPDATE semester_attendance
      SET
          has_grade = true,
          updated_at = NOW()
      FROM grades g
      WHERE semester_attendance.student_id = g.student_id
          AND semester_attendance.class_id = g.class_id
          AND semester_attendance.semester_id = g.semester_id
          AND semester_attendance.attendance_date = g.date_graded
          AND semester_attendance.has_grade = false;
    `);

    const summary = {
      createdRecords: insertResult.rowCount,
      deletedRecords: deleteResult.rowCount,
      markedGrades: markGradesResult.rowCount
    };

    console.log('✅ Attendance dates fix completed:', summary);

    res.json({
      success: true,
      message: 'تم إصلاح تواريخ الحضور بنجاح',
      summary: {
        createdRecords: summary.createdRecords,
        deletedRecords: summary.deletedRecords,
        markedGrades: summary.markedGrades
      }
    });

  } catch (error) {
    console.error('❌ Error fixing attendance dates:', error);
    res.status(500).json({ error: 'فشل في إصلاح تواريخ الحضور' });
  }
});

// POST /api/attendance/fix-behavior
// Admin-only function to auto-fill behavior grades (السلوك) for grade dates
router.post('/fix-behavior', auth, async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only admins can run this fix
    if (userRole !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    console.log('dY" Admin fixing behavior grades...');

    const insertResult = await pool.query(`
      INSERT INTO grades (
        student_id, course_id, semester_id, class_id,
        grade_value, max_grade, notes, grade_type, date_graded, created_at
      )
      SELECT DISTINCT
        g.student_id,
        sc.id as course_id,
        g.semester_id,
        g.class_id,
        100,
        100,
        'Auto-filled behavior grade',
        'behavior',
        g.date_graded,
        NOW()
      FROM grades g
      CROSS JOIN LATERAL (
        SELECT id
        FROM semester_courses
        WHERE semester_id = g.semester_id
          AND is_active = true
          AND name ILIKE '%السلوك%'
          AND (class_id = g.class_id OR class_id IS NULL)
        ORDER BY (class_id IS NULL) ASC
        LIMIT 1
      ) sc
      LEFT JOIN grades bg ON (
        bg.student_id = g.student_id
        AND bg.semester_id = g.semester_id
        AND bg.class_id = g.class_id
        AND bg.course_id = sc.id
        AND bg.date_graded = g.date_graded
      )
      WHERE g.date_graded IS NOT NULL
        AND bg.id IS NULL;
    `);

    const summary = {
      createdRecords: insertResult.rowCount
    };

    console.log('Behavior grades fix completed:', summary);

    res.json({
      success: true,
      message: 'O¦U. OOæU,OO- O¦U^OOñUSOr OU,O3U,U^UŸ O"U+OªOO-',
      summary
    });

  } catch (error) {
    console.error('Error fixing behavior grades:', error);
    res.status(500).json({ error: 'Failed to fix behavior grades' });
  }
});

module.exports = router;
