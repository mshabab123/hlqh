const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
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

    // Process child IDs - create relationships with existing students or mark for future
    const validChildIds = childIds.filter(childId => childId && childId.trim() !== '');
    
    for (const childId of validChildIds) {
      // Check if student already exists
      const studentCheck = await client.query(
        'SELECT id FROM students WHERE id = $1', 
        [childId]
      );

      if (studentCheck.rows.length > 0) {
        // Student exists, create relationship
        await client.query(`
          INSERT INTO parent_student_relationships (parent_id, student_id, is_primary)
          VALUES ($1, $2, true)
          ON CONFLICT (parent_id, student_id) DO NOTHING
        `, [id, childId]);

        // Update student's parent_id if not set
        await client.query(`
          UPDATE students 
          SET parent_id = $1 
          WHERE id = $2 AND parent_id IS NULL
        `, [id, childId]);
      } else {
        // Student doesn't exist yet, we could create a pending relationship
        // Or just log this for future reference when student registers
        console.log(`Child ID ${childId} not found, will be linked when student registers`);
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: '✅ تم تسجيل طلب ولي الأمر بنجاح. سيتم مراجعة طلبك وإشعارك عند تفعيل الحساب.',
      parentId: id,
      linkedChildren: validChildIds.length,
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

module.exports = router;