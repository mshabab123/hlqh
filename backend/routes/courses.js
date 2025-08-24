const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken: auth } = require('../middleware/auth');

// Update course
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'administrator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل المقرر' });
    }

    const { id } = req.params;
    const { name, percentage, requires_surah, description } = req.body;

    const result = await pool.query(
      'UPDATE semester_courses SET name = $1, percentage = $2, requires_surah = $3, description = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, percentage, requires_surah, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'المقرر غير موجود' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'خطأ في تحديث المقرر' });
  }
});

// Delete course
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'administrator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف المقرر' });
    }

    const { id } = req.params;
    
    // Delete course - CASCADE will handle related grades automatically
    const result = await pool.query('DELETE FROM semester_courses WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'المقرر غير موجود' });
    }

    res.json({ message: 'تم حذف المقرر بنجاح' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'خطأ في حذف المقرر' });
  }
});

module.exports = router;