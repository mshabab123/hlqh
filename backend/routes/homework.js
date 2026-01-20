const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken: requireAuth } = require('../middleware/auth');

// GET /api/homework - Get all homework assignments
router.get('/', requireAuth, async (req, res) => {
  try {
    const { class_id, student_id, status, course_id } = req.query;

    let query = `
      SELECT
        h.*,
        c.name as class_name,
        u.first_name || ' ' || u.last_name as student_name,
        sc.name as course_name
      FROM homework h
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN users u ON h.student_id = u.id
      LEFT JOIN semester_courses sc ON h.course_id = sc.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (class_id) {
      query += ` AND h.class_id = $${paramIndex}`;
      params.push(class_id);
      paramIndex++;
    }

    if (student_id) {
      query += ` AND h.student_id = $${paramIndex}`;
      params.push(student_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND h.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (course_id) {
      query += ` AND h.course_id = $${paramIndex}`;
      params.push(course_id);
      paramIndex++;
    }

    query += ` ORDER BY h.assigned_date DESC, h.due_date DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching homework:', error);
    res.status(500).json({ error: 'فشل في جلب المهام' });
  }
});

// GET /api/homework/:id - Get specific homework assignment
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        h.*,
        c.name as class_name,
        u.first_name || ' ' || u.last_name as student_name,
        sc.name as course_name,
        g.grade_value,
        g.max_grade,
        g.notes as grade_notes
      FROM homework h
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN users u ON h.student_id = u.id
      LEFT JOIN semester_courses sc ON h.course_id = sc.id
      LEFT JOIN grades g ON h.grade_id = g.id
      WHERE h.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المهمة غير موجودة' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching homework:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات المهمة' });
  }
});

// POST /api/homework - Create new homework assignment
router.post('/', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    const {
      class_id,
      student_id,
      course_id,
      title,
      description,
      start_surah,
      start_ayah,
      end_surah,
      end_ayah,
      due_date,
      status = 'pending'
    } = req.body;

    // Validation
    if (!start_surah || !start_ayah || !end_surah || !end_ayah) {
      return res.status(400).json({
        error: 'البيانات المطلوبة: السورة والآية (من - إلى)'
      });
    }

    if (!class_id && !student_id) {
      return res.status(400).json({
        error: 'يجب تحديد الحلقة أو الطالب'
      });
    }

    // Auto-generate title if not provided
    const homeworkTitle = title || `حفظ من سورة ${start_surah} إلى سورة ${end_surah}`;

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO homework (
        class_id, student_id, course_id, title, description,
        start_surah, start_ayah, end_surah, end_ayah,
        assigned_date, due_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, $10, $11)
      RETURNING *
    `, [
      class_id || null,
      student_id || null,
      course_id || null,
      homeworkTitle,
      description || null,
      start_surah,
      start_ayah,
      end_surah,
      end_ayah,
      due_date || null,
      status
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'تم إضافة المهمة بنجاح',
      homework: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating homework:', error);
    res.status(500).json({ error: 'فشل في إضافة المهمة' });
  } finally {
    client.release();
  }
});

// PUT /api/homework/:id - Update homework assignment
router.put('/:id', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const {
      title,
      description,
      start_surah,
      start_ayah,
      end_surah,
      end_ayah,
      due_date,
      status,
      completed_date,
      grade_id
    } = req.body;

    await client.query('BEGIN');

    // Check if homework exists
    const existingHomework = await client.query(
      'SELECT id FROM homework WHERE id = $1',
      [id]
    );

    if (existingHomework.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المهمة غير موجودة' });
    }

    const result = await client.query(`
      UPDATE homework SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_surah = COALESCE($3, start_surah),
        start_ayah = COALESCE($4, start_ayah),
        end_surah = COALESCE($5, end_surah),
        end_ayah = COALESCE($6, end_ayah),
        due_date = COALESCE($7, due_date),
        status = COALESCE($8, status),
        completed_date = COALESCE($9, completed_date),
        grade_id = COALESCE($10, grade_id),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      title,
      description,
      start_surah,
      start_ayah,
      end_surah,
      end_ayah,
      due_date,
      status,
      completed_date,
      grade_id,
      id
    ]);

    await client.query('COMMIT');

    res.json({
      message: 'تم تحديث المهمة بنجاح',
      homework: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating homework:', error);
    res.status(500).json({ error: 'فشل في تحديث المهمة' });
  } finally {
    client.release();
  }
});

// DELETE /api/homework/:id - Delete homework assignment
router.delete('/:id', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM homework WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المهمة غير موجودة' });
    }

    await client.query('COMMIT');

    res.json({ message: 'تم حذف المهمة بنجاح' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting homework:', error);
    res.status(500).json({ error: 'فشل في حذف المهمة' });
  } finally {
    client.release();
  }
});

// POST /api/homework/:id/complete - Mark homework as completed
router.post('/:id/complete', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { grade_id } = req.body;

    await client.query('BEGIN');

    const result = await client.query(`
      UPDATE homework SET
        status = 'completed',
        completed_date = CURRENT_DATE,
        grade_id = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [grade_id || null, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المهمة غير موجودة' });
    }

    await client.query('COMMIT');

    res.json({
      message: 'تم تحديد المهمة كمكتملة',
      homework: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error completing homework:', error);
    res.status(500).json({ error: 'فشل في تحديث حالة المهمة' });
  } finally {
    client.release();
  }
});

module.exports = router;
