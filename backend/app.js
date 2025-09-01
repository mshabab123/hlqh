// app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-domain.com'
    : true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For form data

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
app.use('/api/debug', require('./routes/debug')); // Debug endpoints

// Default route
app.get('/', (req, res) => {
  res.send('School Management API is running 🚀');
});

module.exports = app;
