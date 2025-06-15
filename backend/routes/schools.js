const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE a school
router.post('/', async (req, res) => {
  const {
    name, license_number, address, phone, email, website,
    established_year, logo, supervisor_id
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO schools (
        name, license_number, address, phone, email, website,
        established_year, logo, supervisor_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [name, license_number, address, phone, email, website,
       established_year, logo, supervisor_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ all schools
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM schools ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ one school by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM schools WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a school
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name, license_number, address, phone, email, website,
    established_year, logo, supervisor_id, is_active
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE schools SET
        name = $1,
        license_number = $2,
        address = $3,
        phone = $4,
        email = $5,
        website = $6,
        established_year = $7,
        logo = $8,
        supervisor_id = $9,
        is_active = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *`,
      [name, license_number, address, phone, email, website,
       established_year, logo, supervisor_id, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a school
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM schools WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    res.json({ message: 'School deleted', school: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
