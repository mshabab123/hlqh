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

    // Insert parent/parent-student
    await client.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name, address,
        email, phone, password, role, school_level
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10 , $11
      )
    `, [
      id, first_name, second_name, third_name, last_name, neighborhood,
      email, phone, hashedPassword, parentRole, selfSchoolLevel
    ]);

    // Insert children (if any)
    for (const child of children) {
      const childHashedPassword = await bcrypt.hash(child.password, 10);
      await client.query(`
        INSERT INTO users (
          id, first_name, second_name, third_name, last_name, address, password, role, date_of_birth, phone, school_level, ParentID
        ) VALUES (
          $1, $2, $3, $4, $5, $6,  $7, $8, $9, $10, $11, $12
        )
      `, [
        child.id,
        child.first_name,
        first_name,
        second_name,
        last_name,
        neighborhood,
        childHashedPassword,
        'Student',
        child.date_of_birth,
        child.phone || null,
        child.school_level,
         id,
      ]);
      // You may also want to add to a parent_student_relationships table here!
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

module.exports = router;
