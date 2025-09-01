const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Debug endpoint to check token and environment
router.get('/auth-check', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  const debug = {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    hasJwtSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    nodeEnv: process.env.NODE_ENV || 'development'
  };
  
  if (token) {
    try {
      // Don't verify, just decode to see payload structure
      const decoded = jwt.decode(token);
      debug.tokenPayload = decoded;
      debug.tokenExpired = decoded && decoded.exp < Date.now() / 1000;
    } catch (e) {
      debug.tokenDecodeError = e.message;
    }
  }
  
  res.json({
    message: 'Auth debug info',
    debug
  });
});

// Simple endpoint to test if server is responding
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;