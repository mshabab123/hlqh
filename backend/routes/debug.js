const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Simple endpoint to test if server is responding
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Authenticated auth-check: confirms the caller's token is valid and returns
// only their own (already-known) identity. No JWT secret/length disclosure,
// no decoding of arbitrary unverified tokens.
router.get('/auth-check', authenticateToken, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user?.id,
      role: req.user?.role
    }
  });
});

module.exports = router;
