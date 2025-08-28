const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get students for current parent
router.get('/my-students', authenticateToken, async (req, res) => {
  try {
    const parentId = req.user.id;
    
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        psr.id as relationship_id,
        psr.student_id,
        psr.relationship_type,
        psr.is_primary,
        psr.created_at as relationship_created_at,
        u.id,
        u.first_name,
        u.second_name,
        u.third_name,
        u.last_name,
        u.email,
        u.phone,
        u.address,
        u.date_of_birth,
        u.is_active,
        u.created_at,
        s.school_level,
        s.enrollment_date,
        s.status as student_status,
        sch.name as school_name,
        c.name as class_name,
        c.level as class_level
      FROM parent_student_relationships psr
      JOIN users u ON psr.student_id = u.id
      LEFT JOIN students s ON u.id = s.id
      LEFT JOIN schools sch ON s.school_id = sch.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE psr.parent_id = $1
      ORDER BY psr.is_primary DESC, u.first_name, u.last_name
    `, [parentId]);
    
    client.release();
    res.json({ students: result.rows });
    
  } catch (error) {
    console.error('Error fetching parent students:', error);
    res.status(500).json({ error: 'خطأ في جلب بيانات الطلاب' });
  }
});

// Get detailed student information for parent
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const parentId = req.user.id;
    const { studentId } = req.params;
    
    const client = await pool.connect();
    
    // First verify that this parent has access to this student
    const accessCheck = await client.query(
      'SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
      [parentId, studentId]
    );
    
    if (accessCheck.rows.length === 0) {
      client.release();
      return res.status(403).json({ error: 'غير مسموح لك بالوصول لبيانات هذا الطالب' });
    }
    
    // Get detailed student information
    const studentResult = await client.query(`
      SELECT 
        u.id,
        u.first_name,
        u.second_name,
        u.third_name,
        u.last_name,
        u.email,
        u.phone,
        u.address,
        u.date_of_birth,
        u.is_active,
        u.created_at,
        s.school_level,
        s.enrollment_date,
        s.status as student_status,
        s.notes as student_notes,
        sch.name as school_name,
        sch.address as school_address,
        c.name as class_name,
        c.level as class_level,
        c.description as class_description
      FROM users u
      LEFT JOIN students s ON u.id = s.id
      LEFT JOIN schools sch ON s.school_id = sch.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE u.id = $1
    `, [studentId]);
    
    if (studentResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }
    
    const student = studentResult.rows[0];
    
    // Get grades for this student
    const gradesResult = await client.query(`
      SELECT 
        g.id,
        g.grade_value,
        g.grade_type,
        g.semester,
        g.notes as grade_notes,
        g.created_at as grade_date,
        c.name as course_name,
        c.code as course_code
      FROM grades g
      LEFT JOIN courses c ON g.course_id = c.id
      WHERE g.student_id = $1
      ORDER BY g.created_at DESC
      LIMIT 20
    `, [studentId]);
    
    // Get attendance records
    const attendanceResult = await client.query(`
      SELECT 
        a.id,
        a.status,
        a.date,
        a.notes as attendance_notes,
        a.created_at,
        c.name as class_name
      FROM attendance a
      LEFT JOIN classes c ON a.class_id = c.id
      WHERE a.student_id = $1
      ORDER BY a.date DESC
      LIMIT 20
    `, [studentId]);
    
    client.release();
    
    res.json({
      student: student,
      grades: gradesResult.rows,
      attendance: attendanceResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: 'خطأ في جلب تفاصيل الطالب' });
  }
});

module.exports = router;