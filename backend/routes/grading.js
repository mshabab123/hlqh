const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');

// GET /api/grading/school/:schoolId/semester/:semesterId
// Get comprehensive grading data for all classes in a school/semester
router.get('/school/:schoolId/semester/:semesterId', auth, async (req, res) => {
  try {
    const { schoolId, semesterId } = req.params;

    // Get all classes in this school/semester
    const classesResult = await db.query(`
      SELECT 
        c.id, c.name, c.school_level, c.max_students,
        COUNT(DISTINCT se.student_id) as student_count
      FROM classes c
      LEFT JOIN student_enrollments se ON c.id = se.class_id AND se.status = 'enrolled'
      WHERE c.school_id = $1 AND c.semester_id = $2 AND c.is_active = true
      GROUP BY c.id, c.name, c.school_level, c.max_students
      ORDER BY c.name
    `, [schoolId, semesterId]);

    const classes = classesResult.rows;

    // For each class, get students with their data
    const classesData = [];
    
    for (const classInfo of classes) {
      // Get students in this class
      const studentsResult = await db.query(`
        SELECT 
          u.id, u.first_name, u.second_name, u.third_name, u.last_name,
          s.memorized_surah_id, s.memorized_ayah_number
        FROM student_enrollments se
        JOIN users u ON se.student_id = u.id
        JOIN students s ON u.id = s.id
        WHERE se.class_id = $1 AND se.status = 'enrolled' AND u.is_active = true
        ORDER BY u.first_name, u.last_name
      `, [classInfo.id]);

      const students = [];
      
      for (const student of studentsResult.rows) {
        // Get student's average grade
        const gradesResult = await db.query(`
          SELECT 
            g.grade_value, g.max_grade, sc.percentage,
            sc.name as course_name
          FROM grades g
          JOIN semester_courses sc ON g.course_id = sc.id
          WHERE g.student_id = $1 AND g.class_id = $2
          AND sc.semester_id = $3
        `, [student.id, classInfo.id, semesterId]);

        let totalWeightedGrade = 0;
        let totalWeight = 0;
        const courseGrades = {};

        gradesResult.rows.forEach(grade => {
          const percentage = (grade.grade_value / grade.max_grade) * 100;
          const weight = parseFloat(grade.percentage) || 0;
          
          if (!courseGrades[grade.course_name]) {
            courseGrades[grade.course_name] = [];
          }
          courseGrades[grade.course_name].push(percentage);
          
          totalWeightedGrade += percentage * (weight / 100);
          totalWeight += weight / 100;
        });

        const averageGrade = totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;

        // Get attendance data (present days vs total days)
        const attendanceResult = await db.query(`
          SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN is_present = true THEN 1 ELSE 0 END) as present_days
          FROM semester_attendance sa
          WHERE sa.student_id = $1 AND sa.class_id = $2 AND sa.semester_id = $3
        `, [student.id, classInfo.id, semesterId]);

        const attendance = attendanceResult.rows[0] || { total_days: 0, present_days: 0 };
        const attendanceRate = attendance.total_days > 0 ? 
          (attendance.present_days / attendance.total_days) * 100 : 100;

        // Get points data
        const pointsResult = await db.query(`
          SELECT SUM(points_given) as total_points, COUNT(*) as points_count
          FROM daily_points dp
          WHERE dp.student_id = $1 AND dp.class_id = $2
          AND dp.points_date >= (
            SELECT start_date FROM semesters WHERE id = $3
          )
          AND dp.points_date <= (
            SELECT end_date FROM semesters WHERE id = $3
          )
        `, [student.id, classInfo.id, semesterId]);

        const points = pointsResult.rows[0] || { total_points: 0, points_count: 0 };

        students.push({
          ...student,
          fullName: `${student.first_name} ${student.second_name} ${student.third_name} ${student.last_name}`,
          averageGrade: Math.round(averageGrade * 10) / 10,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          presentDays: attendance.present_days,
          totalDays: attendance.total_days,
          absentDays: attendance.total_days - attendance.present_days,
          totalPoints: points.total_points || 0,
          pointsCount: points.points_count || 0,
          courseGrades
        });
      }

      classesData.push({
        ...classInfo,
        students
      });
    }

    res.json({
      success: true,
      classes: classesData
    });

  } catch (error) {
    console.error('Error fetching grading data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في جلب بيانات الدرجات' 
    });
  }
});

// GET /api/grading/student/:studentId/class/:classId/semester/:semesterId/grades
// Get detailed grades for a specific student
router.get('/student/:studentId/class/:classId/semester/:semesterId/grades', auth, async (req, res) => {
  try {
    const { studentId, classId, semesterId } = req.params;

    // Get all grades for this student
    const gradesResult = await db.query(`
      SELECT 
        g.id, g.grade_value, g.max_grade, g.grade_type, g.notes,
        g.start_reference, g.end_reference, g.date_graded, g.created_at,
        sc.id as course_id, sc.name as course_name, sc.percentage,
        sc.requires_surah, sc.description
      FROM grades g
      JOIN semester_courses sc ON g.course_id = sc.id
      WHERE g.student_id = $1 AND g.class_id = $2 AND sc.semester_id = $3
      ORDER BY sc.name, g.date_graded DESC, g.created_at DESC
    `, [studentId, classId, semesterId]);

    // Group grades by course
    const courseGrades = {};
    gradesResult.rows.forEach(grade => {
      if (!courseGrades[grade.course_id]) {
        courseGrades[grade.course_id] = {
          course_name: grade.course_name,
          percentage: grade.percentage,
          requires_surah: grade.requires_surah,
          description: grade.description,
          grades: []
        };
      }
      courseGrades[grade.course_id].grades.push(grade);
    });

    // Get available courses for this class/semester
    const coursesResult = await db.query(`
      SELECT id, name, percentage, requires_surah, description
      FROM semester_courses
      WHERE semester_id = $1 AND (class_id = $2 OR class_id IS NULL)
      AND (is_active IS NULL OR is_active = true)
      ORDER BY name
    `, [semesterId, classId]);

    res.json({
      success: true,
      courses: coursesResult.rows,
      courseGrades: Object.values(courseGrades)
    });

  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في جلب درجات الطالب' 
    });
  }
});

// PUT /api/grading/grade/:gradeId
// Edit an existing grade
router.put('/grade/:gradeId', auth, async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { 
      grade_value, 
      max_grade, 
      notes, 
      grade_type,
      start_reference,
      end_reference,
      date_graded
    } = req.body;

    const result = await db.query(`
      UPDATE grades 
      SET 
        grade_value = $1,
        max_grade = $2,
        notes = $3,
        grade_type = $4,
        start_reference = $5,
        end_reference = $6,
        date_graded = $7
      WHERE id = $8
      RETURNING *
    `, [
      grade_value, 
      max_grade, 
      notes || null, 
      grade_type || 'regular',
      start_reference || null,
      end_reference || null,
      date_graded || new Date().toISOString().split('T')[0],
      gradeId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'الدرجة غير موجودة' 
      });
    }

    res.json({
      success: true,
      grade: result.rows[0],
      message: 'تم تحديث الدرجة بنجاح'
    });

  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في تحديث الدرجة' 
    });
  }
});

// DELETE /api/grading/grade/:gradeId
// Delete a grade
router.delete('/grade/:gradeId', auth, async (req, res) => {
  try {
    const { gradeId } = req.params;

    const result = await db.query(`
      DELETE FROM grades WHERE id = $1 RETURNING *
    `, [gradeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'الدرجة غير موجودة' 
      });
    }

    res.json({
      success: true,
      message: 'تم حذف الدرجة بنجاح'
    });

  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في حذف الدرجة' 
    });
  }
});

// GET /api/grading/teacher/my-classes
// Get comprehensive grading data for all classes assigned to the current teacher
router.get('/teacher/my-classes', auth, async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Get teacher's assigned classes for current/active semester
    const classesResult = await db.query(`
      SELECT 
        c.id, c.name, c.school_level, c.max_students, c.semester_id,
        s.display_name as semester_name,
        sch.name as school_name,
        tca.teacher_role,
        COUNT(DISTINCT se.student_id) as student_count
      FROM teacher_class_assignments tca
      JOIN classes c ON tca.class_id = c.id
      JOIN semesters s ON c.semester_id = s.id
      JOIN schools sch ON c.school_id = sch.id
      LEFT JOIN student_enrollments se ON c.id = se.class_id AND se.status = 'enrolled'
      WHERE tca.teacher_id = $1 AND c.is_active = true
      AND s.is_active = true
      GROUP BY c.id, c.name, c.school_level, c.max_students, c.semester_id, 
               s.display_name, sch.name, tca.teacher_role
      ORDER BY sch.name, c.name
    `, [teacherId]);

    const classes = classesResult.rows;

    // For each class, get students with their data
    const classesData = [];
    
    for (const classInfo of classes) {
      // Get students in this class
      const studentsResult = await db.query(`
        SELECT 
          u.id, u.first_name, u.second_name, u.third_name, u.last_name,
          s.memorized_surah_id, s.memorized_ayah_number
        FROM student_enrollments se
        JOIN users u ON se.student_id = u.id
        JOIN students s ON u.id = s.id
        WHERE se.class_id = $1 AND se.status = 'enrolled' AND u.is_active = true
        ORDER BY u.first_name, u.last_name
      `, [classInfo.id]);

      const students = [];
      
      for (const student of studentsResult.rows) {
        // Get student's average grade
        const gradesResult = await db.query(`
          SELECT 
            g.grade_value, g.max_grade, sc.percentage,
            sc.name as course_name
          FROM grades g
          JOIN semester_courses sc ON g.course_id = sc.id
          WHERE g.student_id = $1 AND g.class_id = $2
          AND sc.semester_id = $3
        `, [student.id, classInfo.id, classInfo.semester_id]);

        let totalWeightedGrade = 0;
        let totalWeight = 0;
        const courseGrades = {};

        gradesResult.rows.forEach(grade => {
          const percentage = (grade.grade_value / grade.max_grade) * 100;
          const weight = parseFloat(grade.percentage) || 0;
          
          if (!courseGrades[grade.course_name]) {
            courseGrades[grade.course_name] = [];
          }
          courseGrades[grade.course_name].push(percentage);
          
          totalWeightedGrade += percentage * (weight / 100);
          totalWeight += weight / 100;
        });

        const averageGrade = totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;

        // Get attendance data
        const attendanceResult = await db.query(`
          SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN is_present = true THEN 1 ELSE 0 END) as present_days
          FROM semester_attendance sa
          WHERE sa.student_id = $1 AND sa.class_id = $2 AND sa.semester_id = $3
        `, [student.id, classInfo.id, classInfo.semester_id]);

        const attendance = attendanceResult.rows[0] || { total_days: 0, present_days: 0 };
        const attendanceRate = attendance.total_days > 0 ? 
          (attendance.present_days / attendance.total_days) * 100 : 100;

        // Get points data
        const pointsResult = await db.query(`
          SELECT SUM(points_given) as total_points, COUNT(*) as points_count
          FROM daily_points dp
          WHERE dp.student_id = $1 AND dp.class_id = $2
          AND dp.semester_id = $3
        `, [student.id, classInfo.id, classInfo.semester_id]);

        const points = pointsResult.rows[0] || { total_points: 0, points_count: 0 };

        students.push({
          ...student,
          fullName: `${student.first_name} ${student.second_name} ${student.third_name} ${student.last_name}`,
          averageGrade: Math.round(averageGrade * 10) / 10,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          presentDays: attendance.present_days,
          totalDays: attendance.total_days,
          absentDays: attendance.total_days - attendance.present_days,
          totalPoints: points.total_points || 0,
          pointsCount: points.points_count || 0,
          courseGrades
        });
      }

      classesData.push({
        ...classInfo,
        students
      });
    }

    res.json({
      success: true,
      classes: classesData
    });

  } catch (error) {
    console.error('Error fetching teacher grading data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في جلب بيانات الدرجات' 
    });
  }
});

// POST /api/grading/grade
// Add a new grade
router.post('/grade', auth, async (req, res) => {
  try {
    const {
      student_id,
      course_id,
      semester_id,
      class_id,
      grade_value,
      max_grade,
      notes,
      grade_type,
      start_reference,
      end_reference,
      date_graded
    } = req.body;

    const result = await db.query(`
      INSERT INTO grades (
        student_id, course_id, semester_id, class_id, 
        grade_value, max_grade, notes, grade_type,
        start_reference, end_reference, date_graded, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) 
      RETURNING *
    `, [
      student_id,
      course_id,
      semester_id,
      class_id,
      grade_value,
      max_grade || 100,
      notes || null,
      grade_type || 'regular',
      start_reference || null,
      end_reference || null,
      date_graded || new Date().toISOString().split('T')[0]
    ]);

    res.json({
      success: true,
      grade: result.rows[0],
      message: 'تم إضافة الدرجة بنجاح'
    });

  } catch (error) {
    console.error('Error adding grade:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في إضافة الدرجة' 
    });
  }
});

module.exports = router;