const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken: auth } = require('../middleware/auth');

// Check if user has permission to manage reports
const checkReportPermission = (req, res, next) => {
  const userRole = req.user?.role;
  if (!userRole || !['admin', 'administrator', 'supervisor'].includes(userRole)) {
    return res.status(403).json({ error: 'ليس لديك صلاحية لإدارة التقارير اليومية' });
  }
  next();
};

// GET /api/daily-reports - Get daily reports with filters
router.get('/', auth, checkReportPermission, async (req, res) => {
  try {
    const { school_id, date_from, date_to, page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT 
        dr.*,
        s.name as school_name,
        u.first_name || ' ' || u.last_name as reporter_name,
        u.role as reporter_role
      FROM daily_reports dr
      JOIN schools s ON dr.school_id = s.id
      JOIN users u ON dr.reporter_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (school_id) {
      query += ` AND dr.school_id = $${paramIndex}`;
      params.push(school_id);
      paramIndex++;
    }
    
    if (date_from) {
      query += ` AND dr.report_date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    
    if (date_to) {
      query += ` AND dr.report_date <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY dr.report_date DESC, dr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM daily_reports dr
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamIndex = 1;
    
    if (school_id) {
      countQuery += ` AND dr.school_id = $${countParamIndex}`;
      countParams.push(school_id);
      countParamIndex++;
    }
    
    if (date_from) {
      countQuery += ` AND dr.report_date >= $${countParamIndex}`;
      countParams.push(date_from);
      countParamIndex++;
    }
    
    if (date_to) {
      countQuery += ` AND dr.report_date <= $${countParamIndex}`;
      countParams.push(date_to);
      countParamIndex++;
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    res.json({
      reports: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    res.status(500).json({ error: 'فشل في جلب التقارير اليومية' });
  }
});

// GET /api/daily-reports/:id - Get single daily report with class details
router.get('/:id', auth, checkReportPermission, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get main report
    const reportResult = await db.query(`
      SELECT 
        dr.*,
        s.name as school_name,
        u.first_name || ' ' || u.last_name as reporter_name,
        u.role as reporter_role
      FROM daily_reports dr
      JOIN schools s ON dr.school_id = s.id
      JOIN users u ON dr.reporter_id = u.id
      WHERE dr.id = $1
    `, [id]);
    
    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'التقرير غير موجود' });
    }
    
    const report = reportResult.rows[0];
    
    // Get class reports for this daily report
    const classReportsResult = await db.query(`
      SELECT 
        dcr.*,
        c.name as class_name,
        u.first_name || ' ' || u.last_name as teacher_name
      FROM daily_class_reports dcr
      JOIN classes c ON dcr.class_id = c.id
      LEFT JOIN users u ON dcr.teacher_id = u.id
      WHERE dcr.daily_report_id = $1
      ORDER BY c.name
    `, [id]);
    
    report.class_reports = classReportsResult.rows;
    
    res.json(report);
    
  } catch (error) {
    console.error('Error fetching daily report:', error);
    res.status(500).json({ error: 'فشل في جلب التقرير اليومي' });
  }
});

// POST /api/daily-reports - Create new daily report
router.post('/', auth, checkReportPermission, async (req, res) => {
  try {
    const {
      school_id,
      report_date,
      report_notes,
      class_reports = []
    } = req.body;
    
    if (!school_id || !report_date) {
      return res.status(400).json({ error: 'معرف المدرسة وتاريخ التقرير مطلوبان' });
    }
    
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if report already exists for this school and date
      const existingResult = await client.query(
        'SELECT id FROM daily_reports WHERE school_id = $1 AND report_date = $2',
        [school_id, report_date]
      );
      
      if (existingResult.rows.length > 0) {
        return res.status(400).json({ error: 'يوجد تقرير سابق' });
      }
      
      // Calculate statistics from class reports
      let totalClasses = class_reports.length;
      let totalStudents = 0;
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalTeachers = 0;
      let totalPagesTaught = 0;
      let newStudents = 0;
      
      class_reports.forEach(classReport => {
        totalStudents += parseInt(classReport.students_enrolled || 0);
        totalPresent += parseInt(classReport.students_present || 0);
        totalAbsent += parseInt(classReport.students_absent || 0);
        totalPagesTaught += parseInt(classReport.pages_taught || 0);
        if (classReport.teacher_id) totalTeachers++;
      });
      
      // Create main daily report
      const reportResult = await client.query(`
        INSERT INTO daily_reports (
          school_id, report_date, reporter_id, report_notes,
          total_classes, total_students, total_present, total_absent,
          new_students, total_teachers, total_pages_taught
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        school_id, report_date, req.user.id, report_notes,
        totalClasses, totalStudents, totalPresent, totalAbsent,
        newStudents, totalTeachers, totalPagesTaught
      ]);
      
      const dailyReportId = reportResult.rows[0].id;
      
      // Create class reports
      for (const classReport of class_reports) {
        await client.query(`
          INSERT INTO daily_class_reports (
            daily_report_id, class_id, class_date, teacher_id,
            students_enrolled, students_present, students_absent,
            pages_taught, lesson_topic, class_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          dailyReportId,
          classReport.class_id,
          report_date,
          classReport.teacher_id || null,
          classReport.students_enrolled || 0,
          classReport.students_present || 0,
          classReport.students_absent || 0,
          classReport.pages_taught || 0,
          classReport.lesson_topic,
          classReport.class_notes
        ]);
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'تم إنشاء التقرير اليومي بنجاح',
        report: reportResult.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating daily report:', error);
    res.status(500).json({ error: 'فشل في إنشاء التقرير اليومي' });
  }
});

// PUT /api/daily-reports/:id - Update daily report
router.put('/:id', auth, checkReportPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      report_notes,
      class_reports = []
    } = req.body;
    
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if report exists
      const existingResult = await client.query('SELECT * FROM daily_reports WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'التقرير غير موجود' });
      }
      
      // Recalculate statistics
      let totalClasses = class_reports.length;
      let totalStudents = 0;
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalTeachers = 0;
      let totalPagesTaught = 0;
      
      class_reports.forEach(classReport => {
        totalStudents += parseInt(classReport.students_enrolled || 0);
        totalPresent += parseInt(classReport.students_present || 0);
        totalAbsent += parseInt(classReport.students_absent || 0);
        totalPagesTaught += parseInt(classReport.pages_taught || 0);
        if (classReport.teacher_id) totalTeachers++;
      });
      
      // Update main report
      const updateResult = await client.query(`
        UPDATE daily_reports 
        SET report_notes = $1,
            total_classes = $2,
            total_students = $3,
            total_present = $4,
            total_absent = $5,
            total_teachers = $6,
            total_pages_taught = $7
        WHERE id = $8
        RETURNING *
      `, [
        report_notes, totalClasses, totalStudents, totalPresent,
        totalAbsent, totalTeachers, totalPagesTaught, id
      ]);
      
      // Delete existing class reports
      await client.query('DELETE FROM daily_class_reports WHERE daily_report_id = $1', [id]);
      
      // Insert updated class reports
      const reportDate = existingResult.rows[0].report_date;
      for (const classReport of class_reports) {
        await client.query(`
          INSERT INTO daily_class_reports (
            daily_report_id, class_id, class_date, teacher_id,
            students_enrolled, students_present, students_absent,
            pages_taught, lesson_topic, class_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          id,
          classReport.class_id,
          reportDate,
          classReport.teacher_id || null,
          classReport.students_enrolled || 0,
          classReport.students_present || 0,
          classReport.students_absent || 0,
          classReport.pages_taught || 0,
          classReport.lesson_topic,
          classReport.class_notes
        ]);
      }
      
      await client.query('COMMIT');
      
      res.json({
        message: 'تم تحديث التقرير اليومي بنجاح',
        report: updateResult.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error updating daily report:', error);
    res.status(500).json({ error: 'فشل في تحديث التقرير اليومي' });
  }
});

// DELETE /api/daily-reports/:id - Delete daily report
router.delete('/:id', auth, checkReportPermission, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM daily_reports WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'التقرير غير موجود' });
    }
    
    res.json({ message: 'تم حذف التقرير اليومي بنجاح' });
    
  } catch (error) {
    console.error('Error deleting daily report:', error);
    res.status(500).json({ error: 'فشل في حذف التقرير اليومي' });
  }
});

// GET /api/daily-reports/auto-fill/:schoolId/:date - Auto-fill attendance data for report
router.get('/auto-fill/:schoolId/:date', auth, checkReportPermission, async (req, res) => {
  try {
    const { schoolId, date } = req.params;
    
    if (!schoolId || !date) {
      return res.status(400).json({ error: 'معرف المدرسة والتاريخ مطلوبان' });
    }
    
    // Get current semester (you might need to adjust this logic based on your semester structure)
    const currentSemesterResult = await db.query(`
      SELECT id FROM semesters 
      WHERE start_date <= $1 AND end_date >= $1 
      ORDER BY start_date DESC 
      LIMIT 1
    `, [date]);
    
    if (currentSemesterResult.rows.length === 0) {
      return res.status(404).json({ error: 'لا يوجد فصل دراسي نشط لهذا التاريخ' });
    }
    
    const semesterId = currentSemesterResult.rows[0].id;
    
    // Get all classes for this school
    const classesResult = await db.query(`
      SELECT DISTINCT c.id, c.name
      FROM classes c
      WHERE c.school_id = $1 AND c.is_active = true
    `, [schoolId]);
    
    const classReports = [];
    
    // For each class, calculate attendance statistics
    for (const classData of classesResult.rows) {
      // Get total enrolled students for this class
      const enrollmentResult = await db.query(`
        SELECT COUNT(*) as total_enrolled
        FROM student_enrollments se
        WHERE se.class_id = $1 AND se.status = 'enrolled'
      `, [classData.id]);
      
      const totalEnrolled = parseInt(enrollmentResult.rows[0].total_enrolled) || 0;
      
      // Get attendance data for this specific date
      const attendanceResult = await db.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN is_present = true THEN 1 END) as present_count,
          COUNT(CASE WHEN is_present = false THEN 1 END) as absent_count
        FROM semester_attendance
        WHERE class_id = $1 AND semester_id = $2 AND attendance_date = $3
      `, [classData.id, semesterId, date]);
      
      const attendanceStats = attendanceResult.rows[0];
      const presentCount = parseInt(attendanceStats.present_count) || 0;
      const absentCount = parseInt(attendanceStats.absent_count) || 0;
      const totalWithRecords = parseInt(attendanceStats.total_records) || 0;
      
      // If no attendance records exist, assume all students are absent
      // If partial records exist, calculate based on enrolled vs recorded
      let finalPresentCount = presentCount;
      let finalAbsentCount = absentCount;
      
      if (totalWithRecords === 0) {
        // No attendance records - all students considered absent
        finalPresentCount = 0;
        finalAbsentCount = totalEnrolled;
      } else if (totalWithRecords < totalEnrolled) {
        // Some students don't have attendance records - consider them absent
        finalAbsentCount = absentCount + (totalEnrolled - totalWithRecords);
      }
      
      // Get assigned teacher for this class
      const teacherResult = await db.query(`
        SELECT u.id, u.first_name, u.last_name
        FROM teacher_class_assignments tca
        JOIN users u ON tca.teacher_id = u.id
        WHERE tca.class_id = $1 AND tca.is_active = true
        LIMIT 1
      `, [classData.id]);
      
      const teacher = teacherResult.rows[0];
      
      classReports.push({
        class_id: classData.id,
        class_name: classData.name,
        teacher_id: teacher?.id || '',
        teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : '',
        students_enrolled: totalEnrolled,
        students_present: finalPresentCount,
        students_absent: finalAbsentCount,
        pages_taught: 0, // Default to 0, user can modify
        lesson_topic: '',
        class_notes: ''
      });
    }
    
    res.json({
      school_id: schoolId,
      date: date,
      semester_id: semesterId,
      class_reports: classReports,
      summary: {
        total_classes: classReports.length,
        total_students: classReports.reduce((sum, cr) => sum + cr.students_enrolled, 0),
        total_present: classReports.reduce((sum, cr) => sum + cr.students_present, 0),
        total_absent: classReports.reduce((sum, cr) => sum + cr.students_absent, 0),
        total_teachers: classReports.filter(cr => cr.teacher_id).length
      }
    });
    
  } catch (error) {
    console.error('Error auto-filling report data:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات الحضور التلقائية' });
  }
});

// GET /api/daily-reports/statistics/summary - Get overall statistics
router.get('/statistics/summary', auth, checkReportPermission, async (req, res) => {
  try {
    const { school_id, date_from, date_to } = req.query;
    
    let query = `
      SELECT 
        COUNT(*) as total_reports,
        SUM(total_classes) as total_classes,
        SUM(total_students) as total_students,
        SUM(total_present) as total_present,
        SUM(total_absent) as total_absent,
        SUM(total_teachers) as total_teachers,
        SUM(total_pages_taught) as total_pages,
        ROUND(AVG(total_present::decimal / NULLIF(total_students::decimal, 0) * 100), 2) as avg_attendance_rate
      FROM daily_reports
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (school_id) {
      query += ` AND school_id = $${paramIndex}`;
      params.push(school_id);
      paramIndex++;
    }
    
    if (date_from) {
      query += ` AND report_date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    
    if (date_to) {
      query += ` AND report_date <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    
    const result = await db.query(query, params);
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'فشل في جلب الإحصائيات' });
  }
});

module.exports = router;