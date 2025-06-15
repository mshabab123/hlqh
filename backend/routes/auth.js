const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET_KEY = process.env.JWT_SECRET || 'my_super_secret';

// Login
router.post('/login', async (req, res) => {
  const { id, password } = req.body;
console.log("this is ")
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }


    const user = result.rows[0];  
    const isValid = await bcrypt.compare(password, user.password);
    console.log(isValid);
    if (!isValid) return res.status(401).json({ error: 'Wrong password' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      SECRET_KEY,
      { expiresIn: '2h' }
    );

    res.json({ token, user: { id: user.id, role: user.role, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
