// app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Required for req.body

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users')); // Keep for backward compatibility
app.use('/api/parents', require('./routes/parents')); // New parent registration
app.use('/api/students', require('./routes/students')); // New student registration
app.use('/api/teachers', require('./routes/teachers')); // New teacher registration
app.use('/api/schools', require('./routes/schools'));
app.use('/api/classes', require('./routes/classes'));

// Default route
app.get('/', (req, res) => {
  res.send('School Management API is running 🚀');
});

module.exports = app;
