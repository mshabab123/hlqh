const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken: auth } = require('../middleware/auth');

// Get all semesters (optionally filtered by school)
router.get('/', auth, async (req, res) => {
  try {
    const { school_id } = req.query;
    
    let query;
    let params = [];
    
    if (school_id) {
      query = `
        SELECT s.*, sc.name as school_name 
        FROM semesters s
        LEFT JOIN schools sc ON s.school_id = sc.id
        WHERE s.school_id = $1 
        ORDER BY s.year DESC, s.type
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
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ message: 'خطأ في جلب الفصول الدراسية' });
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

    const { type, year, start_date, end_date, display_name, school_id, weekend_days, vacation_days } = req.body;

    // Validate required school_id
    if (!school_id) {
      return res.status(400).json({ message: 'يجب تحديد المجمع للفصل الدراسي' });
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
      'INSERT INTO semesters (school_id, type, year, start_date, end_date, display_name, weekend_days, vacation_days, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *',
      [school_id, type, year, start_date, end_date, display_name, JSON.stringify(weekend_days || [5, 6]), JSON.stringify(vacation_days || [])]
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
    const { type, year, start_date, end_date, display_name, school_id, weekend_days, vacation_days } = req.body;

    // If school_id is provided, validate it
    if (school_id) {
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
      'UPDATE semesters SET type = $1, year = $2, start_date = $3, end_date = $4, display_name = $5, school_id = $6, weekend_days = $7, vacation_days = $8, updated_at = NOW() WHERE id = $9 RETURNING *',
      [type, year, start_date, end_date, display_name, school_id, JSON.stringify(weekend_days || [5, 6]), JSON.stringify(vacation_days || []), id]
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
    
    const result = await pool.query(
      'SELECT * FROM semester_courses WHERE semester_id = $1 AND class_id = $2 ORDER BY name',
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
    const { name, percentage, requires_surah, description, school_id, class_id } = req.body;

    const result = await pool.query(
      'INSERT INTO semester_courses (semester_id, school_id, class_id, name, percentage, requires_surah, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
      [semesterId, school_id, class_id, name, percentage, requires_surah, description]
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
    const { name, percentage, requires_surah, description } = req.body;

    // Get class info to determine school_id
    const classResult = await pool.query('SELECT school_id FROM classes WHERE id = $1', [classId]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ message: 'الحلقة غير موجودة' });
    }

    const result = await pool.query(
      'INSERT INTO semester_courses (semester_id, school_id, class_id, name, percentage, requires_surah, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
      [semesterId, classResult.rows[0].school_id, classId, name, percentage, requires_surah, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating class course:', error);
    res.status(500).json({ message: 'خطأ في إنشاء مقرر الحلقة' });
  }
});

module.exports = router;