const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken: auth } = require('../middleware/auth');

// Get grades for a semester and class
router.get('/semester/:semesterId/class/:classId', auth, async (req, res) => {
  try {
    const { semesterId, classId } = req.params;
    
    const result = await pool.query(`
      SELECT g.*, s.first_name, s.last_name, c.name as course_name
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN semester_courses c ON g.course_id = c.id
      JOIN student_classes sc ON s.id = sc.student_id
      WHERE g.semester_id = $1 AND sc.class_id = $2
      ORDER BY s.first_name, s.last_name, c.name
    `, [semesterId, classId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ message: 'خطأ في جلب الدرجات' });
  }
});

// Get student's grades for a semester
router.get('/student/:studentId/semester/:semesterId', auth, async (req, res) => {
  try {
    const { studentId, semesterId } = req.params;
    
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
      score,
      from_surah,
      from_ayah,
      to_surah,
      to_ayah,
      notes
    } = req.body;

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
          score = $1, 
          from_surah = $2, 
          from_ayah = $3, 
          to_surah = $4, 
          to_ayah = $5, 
          notes = $6, 
          updated_at = NOW()
        WHERE student_id = $7 AND course_id = $8 AND semester_id = $9 
        RETURNING *
      `, [score, from_surah, from_ayah, to_surah, to_ayah, notes, student_id, course_id, semester_id]);
    } else {
      // Create new grade
      result = await pool.query(`
        INSERT INTO grades (
          student_id, course_id, semester_id, score, 
          from_surah, from_ayah, to_surah, to_ayah, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *
      `, [student_id, course_id, semester_id, score, from_surah, from_ayah, to_surah, to_ayah, notes]);
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
      notes
    } = req.body;

    const result = await pool.query(`
      UPDATE grades SET 
        score = $1, 
        from_surah = $2, 
        from_ayah = $3, 
        to_surah = $4, 
        to_ayah = $5, 
        notes = $6, 
        updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [score, from_surah, from_ayah, to_surah, to_ayah, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الدرجة غير موجودة' });
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
        s.first_name,
        s.last_name,
        COALESCE(SUM(g.score * c.percentage / 100), 0) as total_score,
        COUNT(g.id) as graded_courses,
        (SELECT COUNT(*) FROM semester_courses WHERE semester_id = $1) as total_courses
      FROM students s
      JOIN student_classes sc ON s.id = sc.student_id
      LEFT JOIN grades g ON s.id = g.student_id AND g.semester_id = $1
      LEFT JOIN semester_courses c ON g.course_id = c.id
      WHERE sc.class_id = $2 AND s.is_active = true
      GROUP BY s.id, s.first_name, s.last_name
      ORDER BY total_score DESC, s.first_name, s.last_name
    `, [semesterId, classId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grades summary:', error);
    res.status(500).json({ message: 'خطأ في جلب ملخص الدرجات' });
  }
});

module.exports = router;