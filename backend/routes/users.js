const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db'); // adjust based on your DB connection setup
const { body, validationResult } = require('express-validator');

const rateLimit = require('express-rate-limit');
const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // limit each IP to 10 requests per windowMs
  message: { error: "لقد تجاوزت الحد المسموح لمحاولات التسجيل. حاول لاحقًا." }
});

// GET all users with comprehensive information
router.get('/', async (req, res) => {
  let client;
  try {
    client = await db.connect();
    
    // Get all users with their basic info and role
    // Start simple and only include columns we know exist
    const query = `
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
        u.school_level,
        u.neighborhood,
        u.notes,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at,
        -- Only get school_id from role tables that we know exist
        COALESCE(
          t.school_id,
          s.school_id,
          a.school_id
        ) as school_id,
        -- For now, set class_id as NULL since we're not sure about table structure
        NULL as class_id
      FROM users u
      LEFT JOIN teachers t ON u.id = t.id AND u.role = 'teacher'
      LEFT JOIN supervisors s ON u.id = s.id AND u.role = 'supervisor'  
      LEFT JOIN administrators a ON u.id = a.id AND u.role = 'administrator'
      ORDER BY u.is_active DESC, u.first_name, u.last_name
    `;
    
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'خطأ في استرجاع المستخدمين' });
  } finally {
    if (client) client.release();
  }
});

  router.post(
  '/',registerLimiter,
  [
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
      .notEmpty()
      .withMessage('يرجى تعبئة كلمة المرور')]
    
  , async (req, res) => {
       const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Send back the first error message (customize as needed)
      return res.status(400).json({ error: errors.array()[0].msg });
    }
     client = await db.connect();
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
      children = [],
      registerSelf,
      selfSchoolLevel,
    } = req.body;

    await client.query('BEGIN');

    // Decide parent role
    let parentRole = registerSelf ? 'Student' : 'Parent';

    // Hash parent password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table (base user data)
    await client.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name, address,
        email, phone, password
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `, [
      id, first_name, second_name, third_name, last_name, neighborhood,
      email, phone, hashedPassword
    ]);

    // Insert into parents table
    await client.query(`
      INSERT INTO parents (
        id, neighborhood, is_also_student, student_school_level
      ) VALUES ($1, $2, $3, $4)
    `, [id, neighborhood, registerSelf, selfSchoolLevel]);

    // If parent is also registering as student
    if (registerSelf && selfSchoolLevel) {
      await client.query(`
        INSERT INTO students (
          id, school_level, parent_id
        ) VALUES ($1, $2, $1)
      `, [id, selfSchoolLevel]);
    }

    // Insert children (if any)
    for (const child of children) {
      const childHashedPassword = await bcrypt.hash(child.password, 10);
      
      // Insert child into users table
      await client.query(`
        INSERT INTO users (
          id, first_name, second_name, third_name, last_name, address, 
          password, date_of_birth, phone
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
      `, [
        child.id,
        child.first_name,
        first_name,
        second_name,
        last_name,
        neighborhood,
        childHashedPassword,
        child.date_of_birth,
        child.phone || null
      ]);

      // Insert child into students table
      await client.query(`
        INSERT INTO students (
          id, school_level, parent_id
        ) VALUES ($1, $2, $3)
      `, [child.id, child.school_level, id]);

      // Create parent-student relationship
      await client.query(`
        INSERT INTO parent_student_relationships (parent_id, student_id, is_primary)
        VALUES ($1, $2, true)
      `, [id, child.id]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: '✅ تم إنشاء الحساب بنجاح' });

    } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);

    // Detect duplicate key violation
    if (err.code === '23505') {
      if (err.detail && err.detail.includes('email')) {
        return res.status(400).json({ error: "البريد الإلكتروني مستخدم من قبل" });
      }
      if (err.detail && err.detail.includes('id')) {
        return res.status(400).json({ error: "رقم الهوية مستخدم من قبل" });
      }
      return res.status(400).json({ error: "يوجد حساب بنفس البيانات" });
    }

    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب' });
  }
 finally {
    client.release();
  }
});

// PUT /api/users/:id - Update user role and associated information
router.put('/:id', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { role, school_id, class_id, is_active } = req.body;

    // Update the main users table
    const updateUserQuery = `
      UPDATE users 
      SET role = $1, is_active = COALESCE($2, is_active), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const userResult = await client.query(updateUserQuery, [role, is_active, id]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    // Remove user from all role-specific tables first
    await client.query('DELETE FROM teachers WHERE id = $1', [id]);
    await client.query('DELETE FROM administrators WHERE id = $1', [id]);
    await client.query('DELETE FROM supervisors WHERE id = $1', [id]);
    await client.query('DELETE FROM students WHERE id = $1', [id]);

    // Add to appropriate role table based on new role
    // Using comprehensive approach to handle all role assignments
    try {
      switch (role) {
        case 'teacher':
          // Always try to create/update teacher record
          try {
            await client.query(`
              INSERT INTO teachers (id, school_id, hire_date, status, qualifications) 
              VALUES ($1, $2, NOW(), 'active', COALESCE($3, ''))
            `, [id, school_id, '']);
          } catch (insertErr) {
            // If insert fails, try update
            if (school_id) {
              await client.query(`
                UPDATE teachers SET school_id = $1 WHERE id = $2
              `, [school_id, id]);
            } else {
              // Just ensure the teacher record exists
              await client.query(`
                INSERT INTO teachers (id, hire_date, status, qualifications) 
                VALUES ($1, NOW(), 'active', '') 
                ON CONFLICT (id) DO NOTHING
              `, [id]);
            }
          }
          break;

        case 'administrator':
          // Always try to create/update administrator record
          try {
            await client.query(`
              INSERT INTO administrators (id, school_id, hire_date, status, permissions) 
              VALUES ($1, $2, NOW(), 'active', COALESCE($3, ''))
            `, [id, school_id, '']);
          } catch (insertErr) {
            if (school_id) {
              await client.query(`
                UPDATE administrators SET school_id = $1 WHERE id = $2
              `, [school_id, id]);
            } else {
              await client.query(`
                INSERT INTO administrators (id, hire_date, status, permissions) 
                VALUES ($1, NOW(), 'active', '') 
                ON CONFLICT (id) DO NOTHING
              `, [id]);
            }
          }
          break;

        case 'supervisor':
          // Always try to create/update supervisor record
          try {
            await client.query(`
              INSERT INTO supervisors (id, school_id, hire_date, status, permissions, supervised_areas) 
              VALUES ($1, $2, NOW(), 'active', COALESCE($3, ''), COALESCE($4, ''))
            `, [id, school_id, '', '']);
          } catch (insertErr) {
            if (school_id) {
              await client.query(`
                UPDATE supervisors SET school_id = $1 WHERE id = $2
              `, [school_id, id]);
            } else {
              await client.query(`
                INSERT INTO supervisors (id, hire_date, status, permissions, supervised_areas) 
                VALUES ($1, NOW(), 'active', '', '') 
                ON CONFLICT (id) DO NOTHING
              `, [id]);
            }
          }
          break;

        case 'admin':
          try {
            await client.query(`
              INSERT INTO admins (id, hire_date, status, permissions, role) 
              VALUES ($1, NOW(), 'active', 'full_access', 'admin')
              ON CONFLICT (id) DO NOTHING
            `, [id]);
          } catch (insertErr) {
            console.warn('Admin insert failed:', insertErr.message);
          }
          break;

        case 'student':
        case 'parent':
          // No separate tables for these roles currently
          break;
      }
    } catch (roleErr) {
      console.warn('Role table operation failed:', roleErr.message);
      // Continue anyway - the main role change in users table was successful
    }

    await client.query('COMMIT');
    
    // Return updated user information
    const updatedUser = await client.query(`
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name,
        u.email, u.phone, u.address, u.role, u.is_active, u.created_at, u.updated_at,
        COALESCE(t.school_id, s.school_id, a.school_id) as school_id,
        NULL as class_id
      FROM users u
      LEFT JOIN teachers t ON u.id = t.id AND u.role = 'teacher'
      LEFT JOIN supervisors s ON u.id = s.id AND u.role = 'supervisor'  
      LEFT JOIN administrators a ON u.id = a.id AND u.role = 'administrator'
      WHERE u.id = $1
    `, [id]);

    res.json({
      message: 'تم تحديث بيانات المستخدم بنجاح',
      user: updatedUser.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'خطأ في تحديث بيانات المستخدم' });
  } finally {
    client.release();
  }
});

// PATCH /api/users/:id/toggle-active - Toggle user active status
router.patch('/:id/toggle-active', async (req, res) => {
  let client;
  try {
    client = await db.connect();
    
    const { id } = req.params;
    
    const result = await client.query(`
      UPDATE users 
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING id, is_active
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const user = result.rows[0];
    res.json({
      message: `تم ${user.is_active ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`,
      user: user
    });

  } catch (err) {
    console.error('Error toggling user status:', err);
    res.status(500).json({ error: 'خطأ في تغيير حالة المستخدم' });
  } finally {
    if (client) client.release();
  }
});

// PUT /api/users/:id/profile - Update user profile information
router.put('/:id/profile', async (req, res) => {
  let client;
  try {
    client = await db.connect();
    
    const { id } = req.params;
    const { 
      first_name, 
      second_name, 
      third_name, 
      last_name, 
      email, 
      phone, 
      address,
      date_of_birth,
      school_level,
      neighborhood,
      notes
    } = req.body;

    // Handle empty date_of_birth by converting to null
    const processedDateOfBirth = date_of_birth && date_of_birth.trim() !== '' ? date_of_birth : null;

    // Update all profile fields including the newly added columns
    const result = await client.query(`
      UPDATE users 
      SET first_name = $1, 
          second_name = $2,
          third_name = $3,
          last_name = $4, 
          email = $5, 
          phone = $6, 
          address = $7,
          date_of_birth = $8,
          school_level = $9,
          neighborhood = $10,
          notes = $11,
          updated_at = NOW()
      WHERE id = $12
      RETURNING id, first_name, second_name, third_name, last_name, email, phone, address, date_of_birth, school_level, neighborhood, notes, role, is_active, created_at
    `, [first_name, second_name, third_name, last_name, email, phone, address, processedDateOfBirth, school_level, neighborhood, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    res.json({
      message: 'تم تحديث الملف الشخصي بنجاح',
      user: result.rows[0]
    });

  } catch (err) {
    console.error('Error updating profile:', err);
    if (err.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'البريد الإلكتروني مستخدم من قبل مستخدم آخر' });
    } else {
      res.status(500).json({ error: 'خطأ في تحديث الملف الشخصي' });
    }
  } finally {
    if (client) client.release();
  }
});

// DELETE /api/users/:id - Delete user permanently
router.delete('/:id', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // First, delete from all role-specific tables
    await client.query('DELETE FROM teachers WHERE id = $1', [id]);
    await client.query('DELETE FROM administrators WHERE id = $1', [id]);
    await client.query('DELETE FROM supervisors WHERE id = $1', [id]);
    await client.query('DELETE FROM students WHERE id = $1', [id]);
    await client.query('DELETE FROM admins WHERE id = $1', [id]);
    
    // Then delete from the main users table
    const result = await client.query(`
      DELETE FROM users 
      WHERE id = $1
      RETURNING id, first_name, last_name, email
    `, [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    await client.query('COMMIT');
    
    const deletedUser = result.rows[0];
    res.json({
      message: 'تم حذف المستخدم بنجاح',
      user: deletedUser
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'خطأ في حذف المستخدم' });
  } finally {
    client.release();
  }
});

module.exports = router;
