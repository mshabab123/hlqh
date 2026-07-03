const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS } = require('../config/security');
const { isStudentAutoActivationEnabled } = require('../utils/appSettings');

// Object-level guard: privileged staff may act on any parentId; everyone else
// may only act on their own (parentId === their own user id).
const STAFF_ROLES = ['admin', 'administrator', 'supervisor', 'teacher'];
const REQUEST_REVIEW_ROLES = ['admin', 'administrator'];

function ensureRequestReviewer(req, res, next) {
  const role = req.user?.role?.toLowerCase();
  if (REQUEST_REVIEW_ROLES.includes(role)) return next();
  return res.status(403).json({ error: 'ليس لديك صلاحية مراجعة طلبات ربط الأبناء' });
}
function ensureOwnParentOrStaff(req, res, next) {
  const role = req.user?.role?.toLowerCase();
  if (STAFF_ROLES.includes(role)) return next();
  if (String(req.user?.id) === String(req.params.parentId)) return next();
  return res.status(403).json({ error: 'غير مصرح بالوصول إلى بيانات ولي أمر آخر' });
}

// Get pending parent-child link requests for platform/admin review.
router.get('/requests/pending', authenticateToken, ensureRequestReviewer, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pclr.id,
        pclr.parent_id,
        pclr.student_id,
        pclr.relationship_type,
        pclr.status,
        pclr.review_notes,
        pclr.created_at,
        pclr.updated_at,
        p.first_name as parent_first_name,
        p.second_name as parent_second_name,
        p.third_name as parent_third_name,
        p.last_name as parent_last_name,
        p.phone as parent_phone,
        p.email as parent_email,
        st.first_name as student_first_name,
        st.second_name as student_second_name,
        st.third_name as student_third_name,
        st.last_name as student_last_name,
        st.date_of_birth as student_date_of_birth,
        s.school_level as student_school_level
      FROM parent_child_link_requests pclr
      JOIN users p ON pclr.parent_id = p.id
      JOIN users st ON pclr.student_id = st.id
      LEFT JOIN students s ON pclr.student_id = s.id
      WHERE pclr.status = 'pending'
      ORDER BY pclr.created_at ASC
    `);

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Error fetching child link requests:', error);
    res.status(500).json({ error: 'فشل في جلب طلبات ربط الأبناء' });
  }
});

// Approve a pending request and create the parent-child relationship.
router.post('/requests/:requestId/approve', authenticateToken, ensureRequestReviewer, async (req, res) => {
  const client = await pool.connect();
  try {
    const { requestId } = req.params;
    const { notes } = req.body || {};

    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT *
       FROM parent_child_link_requests
       WHERE id = $1 AND status = 'pending'
       FOR UPDATE`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'طلب الربط غير موجود أو تمت مراجعته مسبقاً' });
    }

    const request = requestResult.rows[0];

    const existingRelationship = await client.query(
      'SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
      [request.parent_id, request.student_id]
    );

    let relationship = existingRelationship.rows[0] || null;
    if (!relationship) {
      const relationshipResult = await client.query(`
        INSERT INTO parent_student_relationships
          (parent_id, student_id, relationship_type, is_primary, created_at)
        VALUES ($1, $2, $3, false, NOW())
        RETURNING *
      `, [request.parent_id, request.student_id, request.relationship_type || 'parent']);
      relationship = relationshipResult.rows[0];
    }

    await client.query(`
      UPDATE parent_child_link_requests
      SET status = 'approved',
          reviewed_by = $1,
          reviewed_at = NOW(),
          updated_at = NOW(),
          review_notes = $2
      WHERE id = $3
    `, [req.user.id, notes || null, requestId]);

    await client.query('COMMIT');

    res.json({
      message: 'تم اعتماد الطلب وربط الطالب بولي الأمر',
      relationship
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving child link request:', error);
    res.status(500).json({ error: 'فشل في اعتماد طلب الربط' });
  } finally {
    client.release();
  }
});

// Reject a pending request without creating a relationship.
router.post('/requests/:requestId/reject', authenticateToken, ensureRequestReviewer, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body || {};

    const result = await pool.query(`
      UPDATE parent_child_link_requests
      SET status = 'rejected',
          reviewed_by = $1,
          reviewed_at = NOW(),
          updated_at = NOW(),
          review_notes = $2
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `, [req.user.id, notes || null, requestId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'طلب الربط غير موجود أو تمت مراجعته مسبقاً' });
    }

    res.json({ message: 'تم رفض طلب الربط', request: result.rows[0] });
  } catch (error) {
    console.error('Error rejecting child link request:', error);
    res.status(500).json({ error: 'فشل في رفض طلب الربط' });
  }
});

// Get children for a specific parent/user
router.get('/:parentId', authenticateToken, ensureOwnParentOrStaff, async (req, res) => {
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
router.get('/:parentId/available', authenticateToken, ensureOwnParentOrStaff, async (req, res) => {
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

// Request linking a child to the current parent. This does not create the
// relationship directly; platform admins review it from the parent management page.
router.post('/:parentId/request-link', authenticateToken, ensureOwnParentOrStaff, async (req, res) => {
  const client = await pool.connect();
  try {
    const { parentId } = req.params;
    const {
      studentId,
      relationshipType = 'parent',
      dateOfBirth
    } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'رقم هوية الطالب مطلوب' });
    }

    if (!dateOfBirth) {
      return res.status(400).json({ error: 'تاريخ ميلاد الطالب مطلوب' });
    }

    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth);
    if (!isIsoDate || Number.isNaN(Date.parse(dateOfBirth))) {
      return res.status(400).json({ error: 'صيغة تاريخ الميلاد غير صحيحة' });
    }

    await client.query('BEGIN');

    const studentResult = await client.query(
      `SELECT id, role, first_name, last_name,
              to_char(date_of_birth::date, 'YYYY-MM-DD') as date_of_birth
       FROM users
       WHERE id = $1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'الطالب غير موجود في النظام' });
    }

    const student = studentResult.rows[0];
    if (student.role !== 'student') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'رقم الهوية لا يخص طالباً' });
    }

    const storedDob = student.date_of_birth || null;
    if (!storedDob || storedDob !== dateOfBirth) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'تاريخ ميلاد الطالب غير مطابق' });
    }

    const existingRelationship = await client.query(
      'SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
      [parentId, studentId]
    );

    if (existingRelationship.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'الطالب مربوط بالفعل بهذا الحساب' });
    }

    const pendingRequest = await client.query(
      `SELECT id
       FROM parent_child_link_requests
       WHERE parent_id = $1 AND student_id = $2 AND status = 'pending'`,
      [parentId, studentId]
    );

    if (pendingRequest.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'يوجد طلب ربط معلق لهذا الطالب بانتظار مراجعة الإدارة' });
    }

    const requestResult = await client.query(`
      INSERT INTO parent_child_link_requests
        (parent_id, student_id, relationship_type, requested_by, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
      RETURNING *
    `, [parentId, studentId, relationshipType, req.user.id]);

    await client.query('COMMIT');

    res.status(202).json({
      message: 'تم إرسال طلب إضافة الابن إلى الإدارة للمراجعة',
      request: requestResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error requesting child link:', error);
    res.status(500).json({ error: 'فشل في إرسال طلب إضافة الابن' });
  } finally {
    client.release();
  }
});

// Register a new child/student from the parent's children page.
router.post('/:parentId/register-student', authenticateToken, ensureOwnParentOrStaff, async (req, res) => {
  const client = await pool.connect();
  try {
    const { parentId } = req.params;
    const {
      id,
      first_name,
      second_name,
      third_name,
      last_name,
      date_of_birth,
      school_level,
      password,
      phone,
      email
    } = req.body;

    if (!/^\d{10}$/.test(String(id || ''))) {
      return res.status(400).json({ error: 'رقم هوية الطالب يجب أن يكون 10 أرقام' });
    }

    if (!first_name || !second_name || !third_name || !last_name || !date_of_birth || !school_level || !password) {
      return res.status(400).json({ error: 'يرجى تعبئة بيانات الطالب المطلوبة' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth) || Number.isNaN(Date.parse(date_of_birth))) {
      return res.status(400).json({ error: 'تاريخ الميلاد غير صحيح' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    if (phone && !/^05\d{8}$/.test(phone)) {
      return res.status(400).json({ error: 'رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05' });
    }

    await client.query('BEGIN');

    const existingUser = await client.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'رقم الهوية مستخدم من قبل' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const autoActivateStudent = await isStudentAutoActivationEnabled(client);
    const userIsActive = autoActivateStudent;
    const studentStatus = autoActivateStudent ? 'active' : 'inactive';

    await client.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name, email,
        phone, password, date_of_birth, is_active, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'student')
    `, [id, first_name, second_name, third_name, last_name, email || null, phone || null, hashedPassword, date_of_birth, userIsActive]);

    await client.query(`
      INSERT INTO parents (id, neighborhood, is_also_student, student_school_level)
      SELECT id, COALESCE(address, ''), false, NULL
      FROM users
      WHERE id = $1
      ON CONFLICT (id) DO NOTHING
    `, [parentId]);

    await client.query(`
      INSERT INTO students (id, school_level, parent_id, status)
      VALUES ($1, $2, $3, $4)
    `, [id, school_level, parentId, studentStatus]);

    await client.query(`
      INSERT INTO parent_student_relationships (parent_id, student_id, relationship_type, is_primary, created_at)
      VALUES ($1, $2, 'parent', true, NOW())
      ON CONFLICT (parent_id, student_id)
      DO UPDATE SET relationship_type = 'parent'
    `, [parentId, id]);

    await client.query('COMMIT');

    res.status(201).json({
      message: autoActivateStudent
        ? 'تم تسجيل الطالب وربطه بحساب ولي الأمر. الحساب مفعل ويمكنه الدخول للمنصة.'
        : 'تم تسجيل الطالب وربطه بحساب ولي الأمر. الحساب بانتظار التفعيل من الإدارة.',
      studentId: id,
      status: autoActivateStudent ? 'active' : 'pending_activation'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error registering child student:', error);
    res.status(500).json({ error: 'فشل في تسجيل الطالب' });
  } finally {
    client.release();
  }
});

// Add a child to a parent
router.post('/:parentId/add', authenticateToken, ensureOwnParentOrStaff, async (req, res) => {
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
        `SELECT id, role, is_active, first_name, last_name,
                to_char(date_of_birth::date, 'YYYY-MM-DD') as date_of_birth
         FROM users
         WHERE id = $1`,
        [studentId]
      );
      
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `المستخدم برقم الهوية ${studentId} غير موجود في النظام` });
      }
      
      const user = userCheck.rows[0];

      if (dateOfBirth) {
        const storedDob = user.date_of_birth || null;
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
router.delete('/:parentId/:relationshipId', authenticateToken, ensureOwnParentOrStaff, async (req, res) => {
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
router.put('/:parentId/:relationshipId', authenticateToken, ensureOwnParentOrStaff, async (req, res) => {
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
