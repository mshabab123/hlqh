const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');

// Use a strong secret key! Store in env in production
const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_jwt_key';

router.post('/login', async (req, res) => {
  const { id, password } = req.body;

  try {
    // 1. Find user by id
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' });
    }
    const user = result.rows[0];

    // 2. Check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' });
    }

    // 3. Create JWT payload (do NOT put password!)
    const payload = {
      id: user.id,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    // 4. Sign JWT (1 day expiry)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    // 5. Respond with JWT
    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: payload,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

module.exports = router;
