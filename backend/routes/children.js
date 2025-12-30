const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get children for a specific parent/user
router.get('/:parentId', authenticateToken, async (req, res) => {
  try {
    const { parentId } = req.params;
    
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        psr.id as relationship_id,
        psr.student_id,
        psr.relationship_type,
        psr.is_primary,
        u.first_name,
        u.second_name,
        u.third_name,
        u.last_name,
        u.email,
        u.phone,
        u.is_active,
        s.school_level
      FROM parent_student_relationships psr
      JOIN users u ON psr.student_id = u.id
      LEFT JOIN students s ON u.id = s.id
      WHERE psr.parent_id = $1
      ORDER BY psr.is_primary DESC, u.first_name, u.last_name
    `, [parentId]);
    
    client.release();
    res.json({ children: result.rows });
    
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ error: 'خطأ في جلب بيانات الأبناء' });
  }
});


// Get available students (not assigned to this parent)
router.get('/:parentId/available', authenticateToken, async (req, res) => {
  try {
    const { parentId } = req.params;
    
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        u.id,
        u.first_name,
        u.second_name,
        u.third_name,
        u.last_name,
        u.email,
        u.is_active,
        s.school_level
      FROM users u
      LEFT JOIN students s ON u.id = s.id
      WHERE u.role = 'student' 
        AND u.id NOT IN (
          SELECT student_id 
          FROM parent_student_relationships 
          WHERE parent_id = $1
        )
      ORDER BY u.first_name, u.last_name
    `, [parentId]);
    
    client.release();
    res.json({ students: result.rows });
    
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({ error: 'خطأ في جلب الطلاب المتاحين' });
  }
});

// Add a child to a parent
router.post('/:parentId/add', authenticateToken, async (req, res) => {
  try {
    const { parentId } = req.params;
    const {
      studentId,
      relationshipType = 'parent',
      isPrimary = false,
      dateOfBirth
    } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ error: 'رقم هوية الطالب مطلوب' });
    }

    if (req.user?.role === 'parent' && !dateOfBirth) {
      return res.status(400).json({ error: 'تاريخ ميلاد الطالب مطلوب' });
    }

    if (dateOfBirth) {
      const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth);
      if (!isIsoDate || Number.isNaN(Date.parse(dateOfBirth))) {
        return res.status(400).json({ error: 'صيغة تاريخ الميلاد غير صحيحة' });
      }
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if parent exists in users table
      const parentCheck = await client.query(
        'SELECT id, first_name, last_name, role FROM users WHERE id = $1',
        [parentId]
      );
      
      if (parentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `المستخدم الأب برقم الهوية ${parentId} غير موجود في النظام` });
      }
      
      // Prevent users from associating with themselves
      if (parentId === studentId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'لا يمكن ربط المستخدم بنفسه' });
      }
      
      // Check if student exists in users table
      const userCheck = await client.query(
        'SELECT id, role, is_active, first_name, last_name, date_of_birth FROM users WHERE id = $1',
        [studentId]
      );
      
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `المستخدم برقم الهوية ${studentId} غير موجود في النظام` });
      }
      
      const user = userCheck.rows[0];

      if (dateOfBirth) {
        const storedDob = user.date_of_birth
          ? new Date(user.date_of_birth).toISOString().slice(0, 10)
          : null;
        if (!storedDob || storedDob !== dateOfBirth) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'تاريخ ميلاد الطالب غير مطابق' });
        }
      }
      
      // Check if user is actually a student
      if (user.role !== 'student') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `المستخدم ${user.first_name} ${user.last_name} ليس طالباً (الدور الحالي: ${user.role})` 
        });
      }
      
      // Note: We allow inactive students to be associated with parents
      
      // Check if relationship already exists
      const existingRelationship = await client.query(
        'SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
        [parentId, studentId]
      );
      
      if (existingRelationship.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `الطالب ${user.first_name} ${user.last_name} مربوط بالفعل بهذا المستخدم` 
        });
      }
      
      // Insert the relationship
      const result = await client.query(`
        INSERT INTO parent_student_relationships 
        (parent_id, student_id, relationship_type, is_primary, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `, [parentId, studentId, relationshipType, isPrimary]);
      
      await client.query('COMMIT');
      client.release();
      
      res.status(201).json({ 
        message: `تم ربط الطالب ${user.first_name} ${user.last_name} بنجاح`,
        relationship: result.rows[0],
        student: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          is_active: user.is_active
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
    
  } catch (error) {
    console.error('Error adding child:', error);
    res.status(500).json({ error: 'خطأ في ربط الطالب' });
  }
});

// Remove a child from a parent
router.delete('/:parentId/:relationshipId', authenticateToken, async (req, res) => {
  try {
    const { parentId, relationshipId } = req.params;
    
    const client = await pool.connect();
    
    const result = await client.query(
      'DELETE FROM parent_student_relationships WHERE id = $1 AND parent_id = $2 RETURNING *',
      [relationshipId, parentId]
    );
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'العلاقة غير موجودة' });
    }
    
    res.json({ message: 'تم إلغاء ربط الطالب بنجاح' });
    
  } catch (error) {
    console.error('Error removing child:', error);
    res.status(500).json({ error: 'خطأ في إلغاء ربط الطالب' });
  }
});

// Update relationship details
router.put('/:parentId/:relationshipId', authenticateToken, async (req, res) => {
  try {
    const { parentId, relationshipId } = req.params;
    const { relationshipType, isPrimary } = req.body;
    
    const client = await pool.connect();
    
    const result = await client.query(
      `UPDATE parent_student_relationships 
       SET relationship_type = COALESCE($1, relationship_type),
           is_primary = COALESCE($2, is_primary)
       WHERE id = $3 AND parent_id = $4 
       RETURNING *`,
      [relationshipType, isPrimary, relationshipId, parentId]
    );
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'العلاقة غير موجودة' });
    }
    
    res.json({ 
      message: 'تم تحديث العلاقة بنجاح',
      relationship: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating relationship:', error);
    res.status(500).json({ error: 'خطأ في تحديث العلاقة' });
  }
});


module.exports = router;
