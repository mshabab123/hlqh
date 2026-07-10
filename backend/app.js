// app.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const isEnabled = (value) => ['1', 'true', 'yes'].includes(String(value).toLowerCase());

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: isProduction ? allowedOrigins : true,
  credentials: true,
  optionsSuccessStatus: 200
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 500 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

app.use(require('./middleware/securityHeaders'));
app.use(cors(corsOptions));
app.use('/api', apiLimiter);
app.use(express.json({ limit: '10mb' })); // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For form data
app.use(require('./middleware/csrf'));

// Set Content-Type header for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

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
if (!isProduction || isEnabled(process.env.ENABLE_DATABASE_ADMIN)) {
  app.use('/api/database', require('./routes/database')); // Database management (Admin only)
}
app.use('/api/dashboard', require('./routes/dashboard')); // Dashboard statistics
app.use('/api/profile', require('./routes/profile')); // User profile management
app.use('/api/children', require('./routes/children')); // Children management
app.use('/api/parent-students', require('./routes/parentStudents')); // Parent-student information
app.use('/api/forgot-password', require('./routes/forgotPassword')); // Password reset
app.use('/api/daily-reports', require('./routes/dailyReports')); // Daily reports system
app.use('/api/points', require('./routes/points')); // Points system
app.use('/api/privileges', require('./routes/privileges')); // Privileges management
app.use('/api/feature-privileges', require('./routes/featurePrivileges')); // Function-level privileges table
app.use('/api/grading', require('./routes/grading')); // Comprehensive grading system
app.use('/api/settings', require('./routes/settings')); // Platform settings
app.use('/api/certificates', require('./routes/certificates')); // Student certificates
app.use('/api/stage-exams', require('./routes/stageExams')); // نظام المرحليات
if (!isProduction || isEnabled(process.env.ENABLE_DEBUG_ROUTES)) {
  app.use('/api/debug', require('./routes/debug')); // Debug endpoints
}
app.use('/api/quran', require('./routes/quran')); // Quran read endpoints
app.use('/api/homework', require('./routes/homework')); // Homework management

// Default route
app.get('/', (req, res) => {
  res.send('School Management API is running 🚀');
});

// 404 handler for unknown API routes
app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// Centralized error handler. Logs full details server-side, but never leaks
// internal error messages / stack traces to clients in production.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  const body = { error: 'حدث خطأ في الخادم' };
  if (!isProduction) {
    body.details = err.message; // developer aid only, never in production
  }
  res.status(status).json(body);
});

module.exports = app;
