const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');

const router = express.Router();

// Auto-create password_reset_tokens table if it doesn't exist
const initializeTable = async () => {
  try {
    // Check if table exists first
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_tokens'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      await pool.query(`
        CREATE TABLE password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(10) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create indexes only if table was just created
      await pool.query(`CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token)`);
      await pool.query(`CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`);
      await pool.query(`CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)`);
      
      console.log('Password reset tokens table created successfully');
    } else {
      console.log('Password reset tokens table already exists');
    }
  } catch (error) {
    // If it's a permission error, just log and continue
    if (error.message.includes('must be owner')) {
      console.log('⚠️  Password reset tokens table exists but no owner permissions. This is OK if table is already set up.');
    } else {
      console.error('Error initializing password reset tokens table:', error.message);
    }
  }
};

// Initialize table on module load
initializeTable();

// Generate secure random token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// POST /api/forgot-password/request - Request password reset
router.post('/request', 
  [
    body('identifier')
      .notEmpty()
      .withMessage('Email or ID is required')
      .custom((value) => {
        // Check if it's either email format or ID format (10 digits)
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const isID = /^[0-9]{10}$/.test(value);
        if (!isEmail && !isID) {
          throw new Error('Please provide a valid email or 10-digit ID');
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

      const { identifier } = req.body;
      
      // Find user by email or ID
      const isEmail = identifier.includes('@');
      const query = isEmail ? 
        'SELECT id, email, first_name, last_name FROM users WHERE email = $1 AND is_active = true' :
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1 AND is_active = true';
      
      const userResult = await pool.query(query, [identifier]);
      
      if (userResult.rows.length === 0) {
        // For security, don't reveal if user exists or not
        return res.json({ 
          message: 'If an account with this information exists, a password reset link has been sent.',
          success: true
        });
      }

      const user = userResult.rows[0];
      
      // Generate reset token
      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      
      // Store reset token in database
      await pool.query(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at) 
        VALUES ($1, $2, $3)
      `, [user.id, resetToken, expiresAt]);
      
      // In a real application, you would send an email here
      // For now, we'll log the reset link (in production, remove this!)
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      console.log(`Password reset link for user ${user.id} (${user.email}): ${resetLink}`);
      
      // TODO: Send email with reset link
      // await sendPasswordResetEmail(user.email, user.first_name, resetLink);
      
      res.json({ 
        message: 'If an account with this information exists, a password reset link has been sent.',
        success: true,
        // In development, return the token for testing (remove in production!)
        ...(process.env.NODE_ENV === 'development' && { resetToken, resetLink })
      });

    } catch (error) {
      console.error('Forgot password request error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }
);

// POST /api/forgot-password/reset - Reset password using token
router.post('/reset',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one letter and one number'),
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

      const { token, newPassword } = req.body;
      
      // Find valid reset token
      const tokenResult = await pool.query(`
        SELECT prt.user_id, prt.expires_at, prt.used, u.email, u.first_name, u.last_name
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()
      `, [token]);
      
      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid or expired reset token'
        });
      }
      
      const tokenData = tokenResult.rows[0];
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const client = await pool.connect();
      await client.query('BEGIN');
      
      try {
        // Update user password
        await client.query(
          'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
          [hashedPassword, tokenData.user_id]
        );
        
        // Mark token as used
        await client.query(
          'UPDATE password_reset_tokens SET used = true WHERE token = $1',
          [token]
        );
        
        // Optionally, invalidate all other reset tokens for this user
        await client.query(
          'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND token != $2',
          [tokenData.user_id, token]
        );
        
        await client.query('COMMIT');
        
        // Log password reset for security audit
        console.log(`Password reset completed for user ${tokenData.user_id} (${tokenData.email}) at ${new Date().toISOString()}`);
        
        res.json({ 
          message: 'Password has been reset successfully',
          success: true
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

// POST /api/forgot-password/verify-token - Verify if reset token is valid
router.post('/verify-token',
  [
    body('token').notEmpty().withMessage('Reset token is required')
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

      const { token } = req.body;
      
      // Check if token is valid and not expired
      const tokenResult = await pool.query(`
        SELECT prt.user_id, prt.expires_at, u.first_name, u.email
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()
      `, [token]);
      
      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid or expired reset token',
          valid: false
        });
      }
      
      const tokenData = tokenResult.rows[0];
      
      res.json({ 
        valid: true,
        user: {
          name: tokenData.first_name,
          email: tokenData.email.replace(/(.{2}).*(@.*)/, '$1***$2') // Partially mask email
        },
        expiresAt: tokenData.expires_at
      });

    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({ error: 'Failed to verify token' });
    }
  }
);

// Cleanup expired tokens (can be called periodically)
router.delete('/cleanup-expired', async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM password_reset_tokens 
      WHERE expires_at < NOW() OR used = true
    `);
    
    res.json({ 
      message: 'Expired tokens cleaned up',
      deletedCount: result.rowCount
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup expired tokens' });
  }
});

module.exports = router;