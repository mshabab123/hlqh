const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db'); // adjust based on your DB connection setup

// Create a new user
router.post('/', async (req, res) => {
  try {
    const {
      id,
      first_name,
      second_name,
      third_name,
      last_name,
      email,
      password, // plaintext
      role,
      school_id,
      phone,
      date_of_birth,
      address
    } = req.body;

    // ✅ Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🛠 Insert into DB with hashed password
    await db.query(`
      INSERT INTO users (
        id, first_name, second_name, third_name, last_name,
        email, password, role, school_id, phone, date_of_birth, address
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12
      )
    `, [
      id, first_name, second_name, third_name, last_name,
      email, hashedPassword, role, school_id, phone, date_of_birth, address
    ]);

    res.status(201).json({ message: '✅ User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during user creation' });
  }
});

module.exports = router;
