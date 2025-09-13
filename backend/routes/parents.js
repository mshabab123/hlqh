const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { body, validationResult } = require('express-validator');

const rateLimit = require('express-rate-limit');
const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // limit each IP to 10 requests per windowMs
  message: { error: "لقد تجاوزت الحد المسموح لمحاولات التسجيل. حاول لاحقًا." }
});

// Parent registration validation rules
const parentValidationRules = [
  body('id')
    .isLength({ min: 10, max: 10 })
    .withMessage('رقم الهوية يجب أن يكون 10 أرقام')
    .isNumeric()
    .withMessage('رقم الهوية يجب أن يتكون من أرقام فقط'),
  body('first_name').notEmpty().withMessage('يرجى تعبئة الإسم الأول'),
  body('second_name').notEmpty().withMessage('يرجى تعبئة الاسم الثاني'),
  body('third_name').notEmpty().withMessage('يرجى تعبئة اسم الجد'),
  body('last_name').notEmpty().withMessage('يرجى تعبئة اسم العائلة'),
  body('neighborhood').notEmpty().withMessage('يرجى تعبئة الحي'),
  body('email')
    .isEmail()
    .withMessage('صيغة البريد الإلكتروني غير صحيحة'),
  body('phone')
    .matches(/^05\d{8}$/)
    .withMessage('رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('childIds')
    .optional()
    .isArray()
    .withMessage('أرقام هوية الأبناء يجب أن تكون مصفوفة'),
  body('childIds.*')
    .optional()
    .isLength({ min: 10, max: 10 })
    .isNumeric()
    .withMessage('رقم هوية الابن يجب أن يكون 10 أرقام'),
  body('registerSelf')
    .optional()
    .isBoolean()
    .withMessage('تسجيل الذات يجب أن يكون قيمة منطقية'),
  body('selfSchoolLevel')
    .if(body('registerSelf').equals(true))
    .notEmpty()
    .withMessage('يرجى اختيار المرحلة الدراسية')
];

// POST /api/parents - Register a parent
router.post('/', registerLimiter, parentValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const client = await db.connect();
  try {
    const {
      id,
      first_name,
      second_name,
      third_name,
      last_name,
      neighborhood,
      email,
      phone,
      password,
      childIds = [],
      registerSelf = false,
      selfSchoolLevel
    } = req.body;

    await client.query('BEGIN');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table (inactive by default)
    await client.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name, email, 
        phone, password, address, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [id, first_name, second_name, third_name, last_name, email, phone, hashedPassword, neighborhood, false]);

    // Insert into parents table
    await client.query(`
      INSERT INTO parents (
        id, neighborhood, is_also_student, student_school_level
      ) VALUES ($1, $2, $3, $4)
    `, [id, neighborhood, registerSelf, selfSchoolLevel]);

    // If parent is also registering as student, add to students table
    if (registerSelf && selfSchoolLevel) {
      await client.query(`
        INSERT INTO students (
          id, school_level, parent_id
        ) VALUES ($1, $2, $1)
      `, [id, selfSchoolLevel]);
    }

    // Process child IDs - ensure it's an array and handle multiple IDs
    let childIdArray = [];
    if (Array.isArray(childIds)) {
      childIdArray = childIds;
    } else if (typeof childIds === 'string') {
      // Handle comma-separated string
      childIdArray = childIds.split(',').map(id => id.trim());
    }
    
    const validChildIds = childIdArray.filter(childId => childId && childId.toString().trim().length === 10);
    
    for (const childId of validChildIds) {
      const trimmedChildId = childId.toString().trim();
      
      // Check if student already exists
      const studentCheck = await client.query(
        'SELECT id FROM students WHERE id = $1', 
        [trimmedChildId]
      );

      // Create relationship regardless of whether student exists (constraints removed)
      await client.query(`
        INSERT INTO parent_student_relationships (parent_id, student_id, is_primary, relationship_type)
        VALUES ($1, $2, true, 'parent')
        ON CONFLICT (parent_id, student_id) DO UPDATE 
        SET relationship_type = 'parent'
      `, [id, trimmedChildId]);
      
      if (studentCheck.rows.length > 0) {
        // Student exists, update their parent_id if not set
        await client.query(`
          UPDATE students 
          SET parent_id = $1 
          WHERE id = $2 AND parent_id IS NULL
        `, [id, trimmedChildId]);
      } else {
        // Student doesn't exist yet - relationship created for future
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: '✅ تم تسجيل طلب ولي الأمر بنجاح. سيتم مراجعة طلبك وإشعارك عند تفعيل الحساب.',
      parentId: id,
      linkedChildren: validChildIds.length,
      childIds: validChildIds,
      isAlsoStudent: registerSelf,
      status: 'pending_activation',
      note: 'الحساب غير مفعل حتى موافقة الإدارة'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Parent registration error:', err);

    // Handle specific database errors
    if (err.code === '23505') {
      if (err.detail && err.detail.includes('email')) {
        return res.status(400).json({ error: "البريد الإلكتروني مستخدم من قبل" });
      }
      if (err.detail && err.detail.includes('id')) {
        return res.status(400).json({ error: "رقم الهوية مستخدم من قبل" });
      }
      return res.status(400).json({ error: "يوجد حساب بنفس البيانات" });
    }

    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء حساب ولي الأمر' });
  } finally {
    client.release();
  }
});

// GET /api/parents/:id - Get parent details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.address, u.created_at,
        p.neighborhood, p.is_also_student, p.student_school_level
      FROM users u
      JOIN parents p ON u.id = p.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ولي الأمر غير موجود' });
    }

    const parent = result.rows[0];
    
    // Get linked children
    const childrenResult = await db.query(`
      SELECT 
        s.id, u.first_name, u.second_name, u.third_name, u.last_name,
        s.school_level, s.status, psr.relationship_type, psr.is_primary
      FROM parent_student_relationships psr
      JOIN students s ON psr.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE psr.parent_id = $1
      ORDER BY psr.is_primary DESC, u.first_name
    `, [id]);

    res.json({
      parent,
      children: childrenResult.rows
    });

  } catch (err) {
    console.error('Get parent error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات ولي الأمر' });
  }
});

// PUT /api/parents/:id/link-child - Link a child to parent
router.put('/:id/link-child', [
  body('childId')
    .isLength({ min: 10, max: 10 })
    .isNumeric()
    .withMessage('رقم هوية الابن يجب أن يكون 10 أرقام'),
  body('relationshipType')
    .optional()
    .isIn(['parent', 'guardian', 'relative'])
    .withMessage('نوع العلاقة غير صحيح')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const client = await db.connect();
  try {
    const { id: parentId } = req.params;
    const { childId, relationshipType = 'parent' } = req.body;

    await client.query('BEGIN');

    // Check if parent exists
    const parentCheck = await client.query(
      'SELECT id FROM parents WHERE id = $1', 
      [parentId]
    );
    if (parentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ولي الأمر غير موجود' });
    }

    // Check if student exists
    const studentCheck = await client.query(
      'SELECT id FROM students WHERE id = $1', 
      [childId]
    );
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    // Create or update relationship
    await client.query(`
      INSERT INTO parent_student_relationships (parent_id, student_id, relationship_type, is_primary)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (parent_id, student_id) 
      DO UPDATE SET relationship_type = $3, is_primary = true
    `, [parentId, childId, relationshipType]);

    // Update student's parent_id if not set
    await client.query(`
      UPDATE students 
      SET parent_id = $1 
      WHERE id = $2 AND parent_id IS NULL
    `, [parentId, childId]);

    await client.query('COMMIT');
    
    res.json({ 
      message: '✅ تم ربط الطالب بولي الأمر بنجاح',
      parentId,
      childId,
      relationshipType
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Link child error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء ربط الطالب' });
  } finally {
    client.release();
  }
});

// DELETE /api/parents/:id/unlink-child/:childId - Remove parent-child relationship
router.delete('/:id/unlink-child/:childId', async (req, res) => {
  const client = await db.connect();
  try {
    const { id: parentId, childId } = req.params;

    await client.query('BEGIN');

    // Remove relationship
    const result = await client.query(`
      DELETE FROM parent_student_relationships 
      WHERE parent_id = $1 AND student_id = $2
    `, [parentId, childId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'العلاقة غير موجودة' });
    }

    // Update student's parent_id to null if this was the primary parent
    await client.query(`
      UPDATE students 
      SET parent_id = NULL 
      WHERE id = $1 AND parent_id = $2
    `, [childId, parentId]);

    await client.query('COMMIT');
    
    res.json({ 
      message: '✅ تم إلغاء ربط الطالب من ولي الأمر بنجاح'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Unlink child error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إلغاء ربط الطالب' });
  } finally {
    client.release();
  }
});

// ============== MANAGEMENT ENDPOINTS (Admin/Supervisor only) ==============

// GET /api/parents/management/list - Get all parents for management
router.get('/management/list', authenticateToken, requireRole('supervisor'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.second_name,
        u.third_name,
        u.last_name,
        u.email,
        u.phone,
        u.is_active,
        u.created_at,
        u.updated_at,
        p.neighborhood
      FROM users u
      JOIN parents p ON u.id = p.id
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      parents: result.rows
    });
  } catch (error) {
    console.error('Error fetching parents for management:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تحميل بيانات أولياء الأمور'
    });
  }
});

// GET /api/parents/management/:parentId/students - Get students for a specific parent
router.get('/management/:parentId/students', authenticateToken, requireRole('supervisor'), async (req, res) => {
  try {
    const { parentId } = req.params;

    const result = await db.query(`
      SELECT 
        s.id,
        u.first_name,
        u.second_name,
        u.third_name,
        u.last_name,
        s.age,
        s.school_level,
        s.created_at,
        c.name as class_name,
        se.enrollment_date,
        psr.relationship_type,
        psr.is_primary
      FROM parent_student_relationships psr
      JOIN students s ON psr.student_id = s.id
      JOIN users u ON s.id = u.id
      LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'enrolled'
      LEFT JOIN classes c ON se.class_id = c.id
      WHERE psr.parent_id = $1
      ORDER BY u.first_name, u.last_name
    `, [parentId]);

    res.json({
      success: true,
      students: result.rows
    });
  } catch (error) {
    console.error('Error fetching parent students:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تحميل بيانات الطلاب'
    });
  }
});

// PUT /api/parents/management/:parentId/toggle-status - Toggle parent activation status
router.put('/management/:parentId/toggle-status', authenticateToken, requireRole('supervisor'), async (req, res) => {
  try {
    const { parentId } = req.params;
    const { is_active } = req.body;

    const result = await db.query(`
      UPDATE users 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND id IN (SELECT id FROM parents)
      RETURNING id, first_name, second_name, third_name, last_name, email, is_active
    `, [is_active, parentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ولي الأمر غير موجود'
      });
    }

    const parent = result.rows[0];
    
    res.json({
      success: true,
      message: is_active ? 'تم تفعيل ولي الأمر بنجاح' : 'تم إلغاء تفعيل ولي الأمر بنجاح',
      parent: parent
    });
  } catch (error) {
    console.error('Error updating parent status:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تحديث حالة ولي الأمر'
    });
  }
});

// GET /api/parents/management/stats - Get parent statistics
router.get('/management/stats', authenticateToken, requireRole('supervisor'), async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_parents,
        COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_parents,
        COUNT(CASE WHEN u.is_active = false THEN 1 END) as inactive_parents
      FROM users u
      JOIN parents p ON u.id = p.id
    `);

    // Get students count for all parents
    const studentsStats = await db.query(`
      SELECT 
        COUNT(DISTINCT psr.student_id) as total_students,
        COUNT(DISTINCT psr.parent_id) as parents_with_students
      FROM parent_student_relationships psr
      JOIN users u ON psr.parent_id = u.id
      JOIN parents p ON u.id = p.id
    `);

    res.json({
      success: true,
      stats: {
        ...stats.rows[0],
        ...studentsStats.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching parent statistics:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تحميل إحصائيات أولياء الأمور'
    });
  }
});

// PUT /api/parents/management/bulk-status - Bulk activate/deactivate parents
router.put('/management/bulk-status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { parentIds, is_active } = req.body;

    if (!Array.isArray(parentIds) || parentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد أولياء الأمور المراد تحديث حالتهم'
      });
    }

    const result = await db.query(`
      UPDATE users 
      SET is_active = $1, updated_at = NOW()
      WHERE id = ANY($2) AND id IN (SELECT id FROM parents)
      RETURNING id, first_name, second_name, third_name, last_name, email, is_active
    `, [is_active, parentIds]);

    res.json({
      success: true,
      message: `تم تحديث حالة ${result.rows.length} من أولياء الأمور`,
      updated_parents: result.rows
    });
  } catch (error) {
    console.error('Error bulk updating parent status:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تحديث حالة أولياء الأمور'
    });
  }
});

module.exports = router;