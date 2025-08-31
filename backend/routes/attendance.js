const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken: requireAuth } = require('../middleware/auth');

// Get attendance for a specific student
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { semester_id, class_id, limit = 30 } = req.query;
    
    let query = `
      SELECT 
        sa.*,
        s.display_name as semester_name,
        c.name as class_name
      FROM semester_attendance sa
      LEFT JOIN semesters s ON sa.semester_id = s.id
      LEFT JOIN classes c ON sa.class_id = c.id
      WHERE sa.student_id = $1
    `;
    
    const params = [studentId];
    let paramIndex = 2;
    
    if (semester_id) {
      query += ` AND sa.semester_id = $${paramIndex}`;
      params.push(semester_id);
      paramIndex++;
    }
    
    if (class_id) {
      query += ` AND sa.class_id = $${paramIndex}`;
      params.push(class_id);
      paramIndex++;
    }
    
    query += ` ORDER BY sa.attendance_date DESC LIMIT $${paramIndex}`;
    params.push(limit);
    
    const result = await db.query(query, params);
    
    // Calculate attendance percentage
    const totalDays = result.rows.length;
    const presentDays = result.rows.filter(r => r.is_present).length;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    res.json({
      attendance: result.rows,
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      percentage
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات حضور الطالب' });
  }
});

// Get attendance for a semester and class
router.get('/semester/:semesterId/class/:classId', requireAuth, async (req, res) => {
  try {
    const { semesterId, classId } = req.params;
    const { date, student_id } = req.query;
    
    let query = `
      SELECT 
        sa.*,
        u.first_name,
        u.second_name, 
        u.third_name,
        u.last_name
      FROM semester_attendance sa
      JOIN students s ON sa.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE sa.semester_id = $1 AND sa.class_id = $2
    `;
    
    const params = [semesterId, classId];
    let paramIndex = 3;
    
    if (date) {
      query += ` AND sa.attendance_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }
    
    if (student_id) {
      query += ` AND sa.student_id = $${paramIndex}`;
      params.push(student_id);
      paramIndex++;
    }
    
    query += ` ORDER BY sa.attendance_date DESC, u.first_name`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات الحضور' });
  }
});

// Get attendance statistics for a student
router.get('/student/:studentId/semester/:semesterId/class/:classId/stats', requireAuth, async (req, res) => {
  try {
    const { studentId, semesterId, classId } = req.params;
    
    // Get semester info
    const semesterResult = await db.query(
      'SELECT start_date, end_date, weekend_days, vacation_days FROM semesters WHERE id = $1',
      [semesterId]
    );
    
    if (semesterResult.rows.length === 0) {
      return res.status(404).json({ error: 'الفصل الدراسي غير موجود' });
    }
    
    const semester = semesterResult.rows[0];
    
    // Get attendance records
    const attendanceResult = await db.query(`
      SELECT attendance_date, is_present, is_explicit, has_grade
      FROM semester_attendance
      WHERE student_id = $1 AND semester_id = $2 AND class_id = $3
      ORDER BY attendance_date
    `, [studentId, semesterId, classId]);
    
    // Calculate statistics
    const attendanceRecords = attendanceResult.rows;
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.attendance_date.toISOString().split('T')[0]] = record;
    });
    
    // Calculate working days and attendance
    let totalWorkingDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let explicitlyMarkedDays = 0;
    let gradeBasedDays = 0;
    
    if (semester.start_date && semester.end_date) {
      const startDate = new Date(semester.start_date);
      const endDate = new Date(semester.end_date);
      const today = new Date();
      const maxDate = endDate < today ? endDate : today;
      
      const weekendDays = semester.weekend_days || [5, 6];
      const vacationDays = semester.vacation_days || [];
      
      let currentDate = new Date(startDate);
      while (currentDate <= maxDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();
        const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        const isWeekend = weekendDays.includes(isoDayOfWeek);
        const isVacation = vacationDays.includes(dateStr);
        
        if (!isWeekend && !isVacation) {
          totalWorkingDays++;
          
          const attendance = attendanceMap[dateStr];
          if (attendance) {
            if (attendance.is_present) {
              presentDays++;
              if (attendance.is_explicit) explicitlyMarkedDays++;
              if (attendance.has_grade) gradeBasedDays++;
            } else {
              absentDays++;
            }
          } else {
            // No attendance record - check if student had grades on this day
            // This would be done with another query to grades table
            // For past working days with no attendance record and no grades, count as absent
            // This matches our auto-mark absent logic
            absentDays++;
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    res.json({
      totalWorkingDays,
      presentDays,
      absentDays,
      explicitlyMarkedDays,
      gradeBasedDays,
      attendanceRate: totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0,
      attendanceRecords
    });
    
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ error: 'فشل في جلب إحصائيات الحضور' });
  }
});

// Mark attendance (create or update)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { semester_id, class_id, student_id, attendance_date, is_present, is_explicit, notes } = req.body;
    
    if (!semester_id || !class_id || !student_id || !attendance_date) {
      return res.status(400).json({ error: 'البيانات المطلوبة مفقودة' });
    }
    
    // Check if attendance record exists
    const existingResult = await db.query(`
      SELECT id FROM semester_attendance
      WHERE semester_id = $1 AND class_id = $2 AND student_id = $3 AND attendance_date = $4
    `, [semester_id, class_id, student_id, attendance_date]);
    
    let result;
    if (existingResult.rows.length > 0) {
      // Update existing record
      result = await db.query(`
        UPDATE semester_attendance
        SET is_present = $1, is_explicit = $2, notes = $3, updated_at = NOW()
        WHERE semester_id = $4 AND class_id = $5 AND student_id = $6 AND attendance_date = $7
        RETURNING *
      `, [is_present, is_explicit || false, notes, semester_id, class_id, student_id, attendance_date]);
    } else {
      // Create new record
      result = await db.query(`
        INSERT INTO semester_attendance 
        (semester_id, class_id, student_id, attendance_date, is_present, is_explicit, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [semester_id, class_id, student_id, attendance_date, is_present, is_explicit || false, notes]);
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'فشل في تسجيل الحضور' });
  }
});

// Auto-mark attendance based on grades
router.post('/auto-mark-from-grades', requireAuth, async (req, res) => {
  try {
    const { semester_id, class_id, date } = req.body;
    
    if (!semester_id || !class_id || !date) {
      return res.status(400).json({ error: 'البيانات المطلوبة مفقودة' });
    }
    
    // Find students who received grades on the specified date
    const gradesResult = await db.query(`
      SELECT DISTINCT g.student_id
      FROM grades g
      WHERE g.class_id = $1 
        AND DATE(g.date_graded) = $2
        OR DATE(g.created_at) = $2
    `, [class_id, date]);
    
    let updatedCount = 0;
    
    for (const grade of gradesResult.rows) {
      // Check if attendance record already exists
      const existingResult = await db.query(`
        SELECT id FROM semester_attendance
        WHERE semester_id = $1 AND class_id = $2 AND student_id = $3 AND attendance_date = $4
      `, [semester_id, class_id, grade.student_id, date]);
      
      if (existingResult.rows.length === 0) {
        // Create attendance record based on grade
        await db.query(`
          INSERT INTO semester_attendance 
          (semester_id, class_id, student_id, attendance_date, is_present, is_explicit, has_grade)
          VALUES ($1, $2, $3, $4, true, false, true)
        `, [semester_id, class_id, grade.student_id, date]);
        updatedCount++;
      } else {
        // Update existing record to mark has_grade = true
        await db.query(`
          UPDATE semester_attendance
          SET has_grade = true, is_present = CASE WHEN is_explicit THEN is_present ELSE true END
          WHERE semester_id = $1 AND class_id = $2 AND student_id = $3 AND attendance_date = $4
        `, [semester_id, class_id, grade.student_id, date]);
      }
    }
    
    res.json({ 
      message: `تم تحديث حضور ${updatedCount} طالب بناءً على الدرجات`,
      updatedCount
    });
    
  } catch (error) {
    console.error('Error auto-marking attendance:', error);
    res.status(500).json({ error: 'فشل في التحديث التلقائي للحضور' });
  }
});

// Auto-mark students as absent for past working days with no attendance or grades
router.post('/auto-mark-absent', requireAuth, async (req, res) => {
  try {
    const { semester_id, class_id, date } = req.body;
    
    if (!semester_id || !class_id) {
      return res.status(400).json({ error: 'البيانات المطلوبة مفقودة' });
    }
    
    // Get semester info
    const semesterResult = await db.query(
      'SELECT start_date, end_date, weekend_days, vacation_days FROM semesters WHERE id = $1',
      [semester_id]
    );
    
    if (semesterResult.rows.length === 0) {
      return res.status(404).json({ error: 'الفصل الدراسي غير موجود' });
    }
    
    const semester = semesterResult.rows[0];
    const weekendDays = semester.weekend_days || [5, 6];
    const vacationDays = semester.vacation_days || [];
    
    // Get all students in this class
    const studentsResult = await db.query(`
      SELECT DISTINCT s.id as student_id
      FROM students s
      JOIN student_enrollments se ON s.id = se.student_id
      WHERE se.class_id = $1 AND se.status = 'enrolled'
    `, [class_id]);
    
    let totalMarkedAbsent = 0;
    const today = new Date();
    
    // Function to check if a date is a working day
    const isWorkingDay = (dateStr) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      const isWeekend = weekendDays.includes(isoDayOfWeek);
      const isVacation = vacationDays.includes(dateStr);
      
      return !isWeekend && !isVacation;
    };
    
    // If specific date provided, process only that date
    if (date) {
      const dateStr = date;
      const dateObj = new Date(dateStr);
      
      // Only process past working days
      if (dateObj < today && isWorkingDay(dateStr)) {
        for (const student of studentsResult.rows) {
          // Check if student already has attendance record for this date
          const attendanceResult = await db.query(`
            SELECT id FROM semester_attendance
            WHERE semester_id = $1 AND class_id = $2 AND student_id = $3 AND attendance_date = $4
          `, [semester_id, class_id, student.student_id, dateStr]);
          
          if (attendanceResult.rows.length === 0) {
            // Check if student has any grades for this date
            const gradeResult = await db.query(`
              SELECT id FROM grades
              WHERE class_id = $1 AND student_id = $2 
                AND (DATE(date_graded) = $3 OR DATE(created_at) = $3)
            `, [class_id, student.student_id, dateStr]);
            
            if (gradeResult.rows.length === 0) {
              // No attendance record and no grades - mark as absent
              await db.query(`
                INSERT INTO semester_attendance 
                (semester_id, class_id, student_id, attendance_date, is_present, is_explicit, has_grade, notes)
                VALUES ($1, $2, $3, $4, false, false, false, 'تم وضع الغياب تلقائياً - لا توجد درجات أو حضور')
              `, [semester_id, class_id, student.student_id, dateStr]);
              totalMarkedAbsent++;
            }
          }
        }
      }
    } else {
      // Process all past working days in semester
      if (semester.start_date && semester.end_date) {
        const startDate = new Date(semester.start_date);
        const endDate = new Date(semester.end_date);
        const maxDate = endDate < today ? endDate : today;
        
        let currentDate = new Date(startDate);
        while (currentDate < maxDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          if (isWorkingDay(dateStr)) {
            for (const student of studentsResult.rows) {
              // Check if student already has attendance record for this date
              const attendanceResult = await db.query(`
                SELECT id FROM semester_attendance
                WHERE semester_id = $1 AND class_id = $2 AND student_id = $3 AND attendance_date = $4
              `, [semester_id, class_id, student.student_id, dateStr]);
              
              if (attendanceResult.rows.length === 0) {
                // Check if student has any grades for this date
                const gradeResult = await db.query(`
                  SELECT id FROM grades
                  WHERE class_id = $1 AND student_id = $2 
                    AND (DATE(date_graded) = $3 OR DATE(created_at) = $3)
                `, [class_id, student.student_id, dateStr]);
                
                if (gradeResult.rows.length === 0) {
                  // No attendance record and no grades - mark as absent
                  await db.query(`
                    INSERT INTO semester_attendance 
                    (semester_id, class_id, student_id, attendance_date, is_present, is_explicit, has_grade, notes)
                    VALUES ($1, $2, $3, $4, false, false, false, 'تم وضع الغياب تلقائياً - لا توجد درجات أو حضور')
                  `, [semester_id, class_id, student.student_id, dateStr]);
                  totalMarkedAbsent++;
                }
              }
            }
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }
    
    res.json({
      message: `تم وضع ${totalMarkedAbsent} طالب كغائب تلقائياً للأيام التي لا توجد بها درجات أو حضور`,
      markedAbsentCount: totalMarkedAbsent
    });
    
  } catch (error) {
    console.error('Error auto-marking absent:', error);
    res.status(500).json({ error: 'فشل في التحديد التلقائي للغياب' });
  }
});

// Get attendance summary for a class and date range
router.get('/summary/semester/:semesterId/class/:classId', requireAuth, async (req, res) => {
  try {
    const { semesterId, classId } = req.params;
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        s.id as student_id,
        s.first_name,
        s.second_name,
        s.third_name,
        s.last_name,
        COUNT(*) as total_days,
        SUM(CASE WHEN sa.is_present = true THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN sa.is_present = false THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN sa.is_explicit = true THEN 1 ELSE 0 END) as explicitly_marked_days,
        SUM(CASE WHEN sa.has_grade = true THEN 1 ELSE 0 END) as grade_based_days,
        ROUND(
          AVG(CASE WHEN sa.is_present = true THEN 100 ELSE 0 END), 2
        ) as attendance_percentage
      FROM students s
      JOIN student_enrollments se ON s.id = se.student_id
      LEFT JOIN semester_attendance sa ON s.id = sa.student_id 
        AND sa.semester_id = $1 
        AND sa.class_id = $2
    `;
    
    const params = [semesterId, classId];
    let paramIndex = 3;
    
    if (start_date && end_date) {
      query += ` AND sa.attendance_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(start_date, end_date);
      paramIndex += 2;
    }
    
    query += `
      WHERE se.class_id = $2 AND se.status = 'enrolled'
      GROUP BY s.id, s.first_name, s.second_name, s.third_name, s.last_name
      ORDER BY s.first_name, s.last_name
    `;
    
    const result = await db.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'فشل في جلب ملخص الحضور' });  }
});

module.exports = router;