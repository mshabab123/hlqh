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
app.use('/api/database', require('./routes/database')); // Database management (Admin only)
app.use('/api/dashboard', require('./routes/dashboard')); // Dashboard statistics
app.use('/api/profile', require('./routes/profile')); // User profile management
app.use('/api/children', require('./routes/children')); // Children management
app.use('/api/parent-students', require('./routes/parentStudents')); // Parent-student information
app.use('/api/forgot-password', require('./routes/forgotPassword')); // Password reset
app.use('/api/attendance-system', require('./routes/attendanceSystem')); // Attendance system
app.use('/api/daily-reports', require('./routes/dailyReports')); // Daily reports system
app.use('/api/points', require('./routes/points')); // Points system
app.use('/api/privileges', require('./routes/privileges')); // Privileges management

// Default route
app.get('/', (req, res) => {
  res.send('School Management API is running 🚀');
});

module.exports = app;
