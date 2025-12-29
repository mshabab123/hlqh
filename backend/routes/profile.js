const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/profile/change-password - Change user's own password
router.post('/change-password', 
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one letter and one number'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get current user data
      const userResult = await pool.query(
        'SELECT id, password, email, first_name, last_name FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ error: 'New password must be different from current password' });
      }

      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password in database
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, userId]
      );

      // Return success without sensitive data
      res.json({ 
        message: 'Password changed successfully',
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`
        }
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// GET /api/profile/me - Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        id, first_name, second_name, third_name, last_name,
        email, phone, address, date_of_birth, role, is_active,
        created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile/me - Update current user profile (non-sensitive fields)
router.put('/me', 
  authenticateToken,
  [
    body('phone').optional().matches(/^05[0-9]{8}$/).withMessage('Invalid phone number format'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('address').optional().isLength({ max: 255 }).withMessage('Address too long'),
    body('date_of_birth').optional().isISO8601().withMessage('Invalid date format')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { phone, email, address, date_of_birth } = req.body;

      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (phone !== undefined) {
        updates.push(`phone = $${paramIndex}`);
        values.push(phone);
        paramIndex++;
      }
      if (email !== undefined) {
        // Check if email is already taken by another user
        const emailCheck = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Email already in use by another user' });
        }
        updates.push(`email = $${paramIndex}`);
        values.push(email);
        paramIndex++;
      }
      if (address !== undefined) {
        updates.push(`address = $${paramIndex}`);
        values.push(address);
        paramIndex++;
      }
      if (date_of_birth !== undefined) {
        updates.push(`date_of_birth = $${paramIndex}`);
        values.push(date_of_birth);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING id, first_name, last_name, email, phone, address, date_of_birth, role
      `;

      const result = await pool.query(query, values);
      
      res.json({ 
        message: 'Profile updated successfully',
        user: result.rows[0]
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

module.exports = router;
