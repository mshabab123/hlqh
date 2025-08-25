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
app.use('/api/administrators', require('./routes/administrators')); // Administrator management
app.use('/api/schools', require('./routes/schools'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/semesters', require('./routes/semesters')); // Semester management
app.use('/api/courses', require('./routes/courses')); // Course management  
app.use('/api/grades', require('./routes/grades')); // Grade management
app.use('/api/attendance', require('./routes/attendance')); // Attendance management
app.use('/api/user-management', require('./routes/userManagement')); // User management (Admin only)

// Default route
app.get('/', (req, res) => {
  res.send('School Management API is running 🚀');
});

module.exports = app;
