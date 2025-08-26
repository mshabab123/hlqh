const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Auto-create attendance tables if they don't exist
const initializeTables = async () => {
  try {
    // Read and execute the attendance system SQL
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '../database/attendance_system.sql');
    
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      // Execute the entire SQL file at once to handle functions with dollar quoting
      await pool.query(sql);
      console.log('Attendance system tables initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing attendance tables:', error);
  }
};

// Initialize tables on module load
initializeTables();

// Helper function to check user permissions for a class
const checkClassPermission = async (userId, userRole, classId) => {
  try {
    switch (userRole) {
      case 'admin':
        return { hasAccess: true, reason: 'admin_full_access' };
        
      case 'administrator':
        // Administrator can access classes in their school
        const adminCheck = await pool.query(`
          SELECT 1 FROM classes c
          JOIN administrators a ON c.school_id = a.school_id
          WHERE c.id = $1 AND a.id = $2
        `, [classId, userId]);
        return { hasAccess: adminCheck.rows.length > 0, reason: 'school_admin' };
        
      case 'supervisor':
        // Supervisor can access classes in their school
        const supCheck = await pool.query(`
          SELECT 1 FROM classes c
          JOIN supervisors s ON c.school_id = s.school_id
          WHERE c.id = $1 AND s.id = $2
        `, [classId, userId]);
        return { hasAccess: supCheck.rows.length > 0, reason: 'school_supervisor' };
        
      case 'teacher':
        // Teacher can only access their own classes
        const teacherCheck = await pool.query(`
          SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2
        `, [classId, userId]);
        return { hasAccess: teacherCheck.rows.length > 0, reason: 'class_teacher' };
        
      default:
        return { hasAccess: false, reason: 'insufficient_role' };
    }
  } catch (error) {
    console.error('Error checking class permission:', error);
    return { hasAccess: false, reason: 'error' };
  }
};

// Helper function to check student access permission
const checkStudentPermission = async (userId, userRole, studentId) => {
  try {
    switch (userRole) {
      case 'admin':
        return { hasAccess: true, reason: 'admin_full_access' };
        
      case 'administrator':
      case 'supervisor':
        // Can access students in their school
        const schoolCheck = await pool.query(`
          SELECT 1 FROM students st
          JOIN classes c ON st.class_id = c.id
          JOIN ${userRole}s a ON c.school_id = a.school_id
          WHERE st.id = $1 AND a.id = $2
        `, [studentId, userId]);
        return { hasAccess: schoolCheck.rows.length > 0, reason: 'school_access' };
        
      case 'teacher':
        // Can access students in their classes
        const teacherCheck = await pool.query(`
          SELECT 1 FROM students st
          JOIN classes c ON st.class_id = c.id
          WHERE st.id = $1 AND c.teacher_id = $2
        `, [studentId, userId]);
        return { hasAccess: teacherCheck.rows.length > 0, reason: 'teacher_student' };
        
      case 'parent':
        // Can access their own children
        const parentCheck = await pool.query(`
          SELECT 1 FROM students WHERE id = $1 AND parent_id = $2
        `, [studentId, userId]);
        return { hasAccess: parentCheck.rows.length > 0, reason: 'parent_child' };
        
      case 'student':
        // Can only access their own record
        return { hasAccess: studentId === userId, reason: 'own_record' };
        
      default:
        return { hasAccess: false, reason: 'insufficient_role' };
    }
  } catch (error) {
    console.error('Error checking student permission:', error);
    return { hasAccess: false, reason: 'error' };
  }
};

// GET /api/attendance-system/classes - Get classes user has access to
router.get('/classes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = `
      SELECT 
        c.id, c.name, c.school_level,
        s.name as school_name,
        u.first_name || ' ' || u.last_name as teacher_name,
        COUNT(DISTINCT sc.student_id) as student_count
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.id
      LEFT JOIN users u ON c.room_number = u.id
      LEFT JOIN student_classes sc ON c.id = sc.class_id AND sc.status = 'active'
    `;
    
    let whereClause = '';
    let params = [];
    
    switch (userRole) {
      case 'admin':
        whereClause = ' WHERE 1=1';
        break;
        
      case 'administrator':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM administrators WHERE id = $1
        )`;
        params = [userId];
        break;
        
      case 'supervisor':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM supervisors WHERE id = $1
        )`;
        params = [userId];
        break;
        
      case 'teacher':
        whereClause = ` WHERE c.id IN (
          SELECT class_id FROM teacher_class_assignments WHERE teacher_id = $1 AND is_active = TRUE
        ) OR c.room_number = $1`;
        params = [userId];
        break;
        
      default:
        return res.status(403).json({ error: 'Access denied' });
    }
    
    query += whereClause + ' GROUP BY c.id, c.name, c.school_level, s.name, u.first_name, u.last_name ORDER BY c.name';
    
    const result = await pool.query(query, params);
    res.json({ classes: result.rows });
    
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/attendance-system/class/:classId/sessions - Get sessions for a class
router.get('/class/:classId/sessions', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check permission
    const permission = await checkClassPermission(userId, userRole, classId);
    if (!permission.hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    let query = `
      SELECT 
        cs.id, cs.session_date, cs.start_time, cs.end_time, cs.status, cs.notes,
        COUNT(ar.id) as attendance_marked_count,
        COUNT(DISTINCT sc.student_id) as total_students
      FROM class_sessions cs
      LEFT JOIN attendance_records ar ON cs.id = ar.session_id
      LEFT JOIN student_classes sc ON cs.class_id = sc.class_id AND sc.status = 'active'
      WHERE cs.class_id = $1
    `;
    
    const params = [classId];
    let paramIndex = 2;
    
    if (startDate) {
      query += ` AND cs.session_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND cs.session_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    query += ' GROUP BY cs.id ORDER BY cs.session_date DESC, cs.start_time';
    
    const result = await pool.query(query, params);
    res.json({ sessions: result.rows });
    
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/attendance-system/class/:classId/session - Create new session
router.post('/class/:classId/session',
  authenticateToken,
  [
    body('sessionDate').isISO8601().withMessage('Valid session date required'),
    body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Valid start time required'),
    body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Valid end time required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }
      
      const { classId } = req.params;
      const { sessionDate, startTime, endTime, notes } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Check permission (only teachers, admins, administrators can create sessions)
      if (!['admin', 'administrator', 'teacher'].includes(userRole)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const permission = await checkClassPermission(userId, userRole, classId);
      if (!permission.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const result = await pool.query(`
        INSERT INTO class_sessions (class_id, session_date, start_time, end_time, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [classId, sessionDate, startTime, endTime, notes, userId]);
      
      res.json({ session: result.rows[0] });
      
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Session already exists for this date' });
      }
      console.error('Create session error:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }
);

// GET /api/attendance-system/session/:sessionId/attendance - Get attendance for a session
router.get('/session/:sessionId/attendance', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get session info and check permission
    const sessionResult = await pool.query(`
      SELECT cs.class_id FROM class_sessions cs WHERE cs.id = $1
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const classId = sessionResult.rows[0].class_id;
    const permission = await checkClassPermission(userId, userRole, classId);
    if (!permission.hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(`
      SELECT 
        s.id as student_id,
        u.first_name, u.second_name, u.third_name, u.last_name,
        ar.status, ar.notes, ar.marked_at, ar.is_manual,
        marker.first_name || ' ' || marker.last_name as marked_by_name
      FROM students s
      JOIN users u ON s.id = u.id
      JOIN student_classes sc ON s.id = sc.student_id AND sc.class_id = $2 AND sc.status = 'active'
      LEFT JOIN attendance_records ar ON ar.session_id = $1 AND ar.student_id = s.id
      LEFT JOIN users marker ON ar.marked_by = marker.id
      ORDER BY u.first_name, u.last_name
    `, [sessionId, classId]);
    
    res.json({ attendance: result.rows });
    
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// POST /api/attendance-system/session/:sessionId/attendance - Mark attendance
router.post('/session/:sessionId/attendance',
  authenticateToken,
  [
    body('attendance').isArray().withMessage('Attendance array required'),
    body('attendance.*.studentId').notEmpty().withMessage('Student ID required'),
    body('attendance.*.status').isIn(['present', 'absent_excused', 'absent_unexcused']).withMessage('Valid status required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }
      
      const { sessionId } = req.params;
      const { attendance } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Get session info and check permission
      const sessionResult = await pool.query(`
        SELECT cs.class_id FROM class_sessions cs WHERE cs.id = $1
      `, [sessionId]);
      
      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      const classId = sessionResult.rows[0].class_id;
      
      // Only teachers, admins, administrators can mark attendance
      if (!['admin', 'administrator', 'teacher'].includes(userRole)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const permission = await checkClassPermission(userId, userRole, classId);
      if (!permission.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const client = await pool.connect();
      await client.query('BEGIN');
      
      try {
        const results = [];
        
        for (const record of attendance) {
          const result = await client.query(`
            INSERT INTO attendance_records (session_id, student_id, status, marked_by, notes, is_manual)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (session_id, student_id) 
            DO UPDATE SET 
              status = EXCLUDED.status,
              marked_by = EXCLUDED.marked_by,
              notes = EXCLUDED.notes,
              is_manual = EXCLUDED.is_manual,
              updated_at = CURRENT_TIMESTAMP
            RETURNING *
          `, [sessionId, record.studentId, record.status, userId, record.notes || null, true]);
          
          results.push(result.rows[0]);
        }
        
        await client.query('COMMIT');
        res.json({ attendance: results });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Mark attendance error:', error);
      res.status(500).json({ error: 'Failed to mark attendance' });
    }
  }
);

// GET /api/attendance-system/student/:studentId/report - Get attendance report for student
router.get('/student/:studentId/report', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check permission
    const permission = await checkStudentPermission(userId, userRole, studentId);
    if (!permission.hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get attendance statistics
    let statsQuery = `
      SELECT * FROM attendance_statistics 
      WHERE student_id = $1
    `;
    let statsParams = [studentId];
    
    if (classId) {
      statsQuery += ' AND class_id = $2';
      statsParams.push(classId);
    }
    
    const statsResult = await pool.query(statsQuery, statsParams);
    
    // Get detailed attendance records
    let detailQuery = `
      SELECT 
        cs.session_date, cs.start_time, cs.end_time,
        c.name as class_name,
        ar.status, ar.notes, ar.marked_at, ar.is_manual,
        marker.first_name || ' ' || marker.last_name as marked_by_name
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      LEFT JOIN attendance_records ar ON cs.id = ar.session_id AND ar.student_id = $1
      LEFT JOIN users marker ON ar.marked_by = marker.id
      WHERE cs.class_id IN (
        SELECT class_id FROM students WHERE id = $1
      )
    `;
    let detailParams = [studentId];
    let paramIndex = 2;
    
    if (classId) {
      detailQuery += ` AND cs.class_id = $${paramIndex}`;
      detailParams.push(classId);
      paramIndex++;
    }
    
    if (startDate) {
      detailQuery += ` AND cs.session_date >= $${paramIndex}`;
      detailParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      detailQuery += ` AND cs.session_date <= $${paramIndex}`;
      detailParams.push(endDate);
      paramIndex++;
    }
    
    detailQuery += ' ORDER BY cs.session_date DESC, cs.start_time';
    
    const detailResult = await pool.query(detailQuery, detailParams);
    
    res.json({
      statistics: statsResult.rows,
      details: detailResult.rows
    });
    
  } catch (error) {
    console.error('Get student report error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance report' });
  }
});

// POST /api/attendance-system/generate-sessions - Generate sessions based on class schedule
router.post('/generate-sessions/:classId',
  authenticateToken,
  [
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }
      
      const { classId } = req.params;
      const { startDate, endDate } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Only admins, administrators, teachers can generate sessions
      if (!['admin', 'administrator', 'teacher'].includes(userRole)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const permission = await checkClassPermission(userId, userRole, classId);
      if (!permission.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const result = await pool.query(`
        SELECT generate_class_sessions($1, $2, $3) as sessions_created
      `, [classId, startDate, endDate]);
      
      res.json({ 
        sessionsCreated: result.rows[0].sessions_created,
        message: `Generated ${result.rows[0].sessions_created} sessions`
      });
      
    } catch (error) {
      console.error('Generate sessions error:', error);
      res.status(500).json({ error: 'Failed to generate sessions' });
    }
  }
);

// GET /api/attendance-system/students - Get students user has access to
router.get('/students', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = `
      SELECT DISTINCT
        s.id, u.first_name, u.second_name, u.third_name, u.last_name,
        c.name as class_name, c.id as class_id,
        sch.name as school_name
      FROM students s
      JOIN users u ON s.id = u.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN schools sch ON c.school_id = sch.id
    `;
    
    let whereClause = '';
    let params = [];
    
    switch (userRole) {
      case 'admin':
        whereClause = ' WHERE 1=1';
        break;
        
      case 'administrator':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM administrators WHERE id = $1
        )`;
        params = [userId];
        break;
        
      case 'supervisor':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM supervisors WHERE id = $1
        )`;
        params = [userId];
        break;
        
      case 'teacher':
        whereClause = ' WHERE c.teacher_id = $1';
        params = [userId];
        break;
        
      case 'parent':
        whereClause = ' WHERE s.parent_id = $1';
        params = [userId];
        break;
        
      case 'student':
        whereClause = ' WHERE s.id = $1';
        params = [userId];
        break;
        
      default:
        return res.status(403).json({ error: 'Access denied' });
    }
    
    query += whereClause + ' ORDER BY u.first_name, u.last_name';
    
    const result = await pool.query(query, params);
    res.json({ students: result.rows });
    
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/attendance-system/reports/statistics - Get attendance statistics
router.get('/reports/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { 
      class_id, 
      student_id, 
      semester_id, 
      date_from, 
      date_to, 
      page = 1, 
      limit = 25 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let baseQuery = `
      FROM attendance_statistics ast
      JOIN students s ON ast.student_id = s.id
      JOIN users u ON s.id = u.id
      JOIN classes c ON ast.class_id = c.id
      LEFT JOIN schools sch ON c.school_id = sch.id
      LEFT JOIN semesters sem ON ast.semester_id = sem.id
    `;
    
    let whereClause = '';
    let params = [];
    let paramIndex = 1;
    
    // Role-based access control
    switch (userRole) {
      case 'admin':
        whereClause = ' WHERE 1=1';
        break;
        
      case 'administrator':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM administrators WHERE id = $${paramIndex}
        )`;
        params.push(userId);
        paramIndex++;
        break;
        
      case 'supervisor':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM supervisors WHERE id = $${paramIndex}
        )`;
        params.push(userId);
        paramIndex++;
        break;
        
      case 'teacher':
        whereClause = ` WHERE c.teacher_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
        break;
        
      case 'parent':
        whereClause = ` WHERE s.parent_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
        break;
        
      case 'student':
        whereClause = ` WHERE s.id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
        break;
        
      default:
        return res.status(403).json({ error: 'Access denied' });
    }
    
    // Add filters
    if (class_id) {
      whereClause += ` AND ast.class_id = $${paramIndex}`;
      params.push(class_id);
      paramIndex++;
    }
    
    if (student_id && userRole !== 'student') {
      whereClause += ` AND ast.student_id = $${paramIndex}`;
      params.push(student_id);
      paramIndex++;
    }
    
    if (semester_id) {
      whereClause += ` AND ast.semester_id = $${paramIndex}`;
      params.push(semester_id);
      paramIndex++;
    }
    
    // Count query
    const countQuery = `SELECT COUNT(*) ${baseQuery} ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Data query
    const dataQuery = `
      SELECT 
        ast.student_id, 
        u.first_name || ' ' || u.last_name as student_name,
        ast.class_id,
        c.name as class_name,
        ast.semester_id,
        sem.name as semester_name,
        ast.total_sessions,
        ast.present_count,
        ast.absent_excused_count,
        ast.absent_unexcused_count,
        ast.attendance_percentage,
        ast.last_updated
      ${baseQuery} ${whereClause}
      ORDER BY ast.attendance_percentage DESC, u.first_name, u.last_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);
    
    res.json({
      statistics: dataResult.rows,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });
    
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance statistics' });
  }
});

// GET /api/attendance-system/reports/detailed - Get detailed attendance records
router.get('/reports/detailed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { 
      class_id, 
      student_id, 
      semester_id, 
      date_from, 
      date_to, 
      page = 1, 
      limit = 25 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let baseQuery = `
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      LEFT JOIN attendance_records ar ON cs.id = ar.session_id
      LEFT JOIN students s ON ar.student_id = s.id
      LEFT JOIN users u ON s.id = u.id
      LEFT JOIN users marker ON ar.marked_by = marker.id
      LEFT JOIN schools sch ON c.school_id = sch.id
    `;
    
    let whereClause = '';
    let params = [];
    let paramIndex = 1;
    
    // Role-based access control
    switch (userRole) {
      case 'admin':
        whereClause = ' WHERE 1=1';
        break;
        
      case 'administrator':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM administrators WHERE id = $${paramIndex}
        )`;
        params.push(userId);
        paramIndex++;
        break;
        
      case 'supervisor':
        whereClause = ` WHERE c.school_id IN (
          SELECT school_id FROM supervisors WHERE id = $${paramIndex}
        )`;
        params.push(userId);
        paramIndex++;
        break;
        
      case 'teacher':
        whereClause = ` WHERE c.teacher_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
        break;
        
      case 'parent':
        whereClause = ` WHERE s.parent_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
        break;
        
      case 'student':
        whereClause = ` WHERE s.id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
        break;
        
      default:
        return res.status(403).json({ error: 'Access denied' });
    }
    
    // Add filters
    if (class_id) {
      whereClause += ` AND cs.class_id = $${paramIndex}`;
      params.push(class_id);
      paramIndex++;
    }
    
    if (student_id && userRole !== 'student') {
      whereClause += ` AND ar.student_id = $${paramIndex}`;
      params.push(student_id);
      paramIndex++;
    }
    
    if (date_from) {
      whereClause += ` AND cs.session_date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    
    if (date_to) {
      whereClause += ` AND cs.session_date <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    
    // Only show records where attendance was recorded
    whereClause += ' AND ar.id IS NOT NULL';
    
    // Count query
    const countQuery = `SELECT COUNT(*) ${baseQuery} ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Data query
    const dataQuery = `
      SELECT 
        cs.session_date,
        cs.start_time,
        cs.end_time,
        c.name as class_name,
        ar.student_id,
        u.first_name || ' ' || u.last_name as student_name,
        ar.status,
        ar.notes,
        ar.marked_at,
        ar.is_manual,
        marker.first_name || ' ' || marker.last_name as marked_by_name
      ${baseQuery} ${whereClause}
      ORDER BY cs.session_date DESC, cs.start_time, u.first_name, u.last_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);
    
    res.json({
      records: dataResult.rows,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });
    
  } catch (error) {
    console.error('Get detailed records error:', error);
    res.status(500).json({ error: 'Failed to fetch detailed attendance records' });
  }
});

// GET /api/attendance-system/reports/export - Export attendance data
router.get('/reports/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { 
      class_id, 
      student_id, 
      semester_id, 
      date_from, 
      date_to, 
      format = 'csv',
      view = 'summary'
    } = req.query;
    
    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use csv or json.' });
    }
    
    let data = [];
    
    if (view === 'summary') {
      // Export statistics
      let query = `
        SELECT 
          ast.student_id, 
          u.first_name || ' ' || u.last_name as student_name,
          c.name as class_name,
          sem.name as semester_name,
          ast.total_sessions,
          ast.present_count,
          ast.absent_excused_count,
          ast.absent_unexcused_count,
          ast.attendance_percentage
        FROM attendance_statistics ast
        JOIN students s ON ast.student_id = s.id
        JOIN users u ON s.id = u.id
        JOIN classes c ON ast.class_id = c.id
        LEFT JOIN semesters sem ON ast.semester_id = sem.id
      `;
      
      let whereClause = '';
      let params = [];
      let paramIndex = 1;
      
      // Role-based access control (same as statistics endpoint)
      switch (userRole) {
        case 'admin':
          whereClause = ' WHERE 1=1';
          break;
        case 'administrator':
          whereClause = ` WHERE c.school_id IN (SELECT school_id FROM administrators WHERE id = $${paramIndex})`;
          params.push(userId);
          paramIndex++;
          break;
        case 'supervisor':
          whereClause = ` WHERE c.school_id IN (SELECT school_id FROM supervisors WHERE id = $${paramIndex})`;
          params.push(userId);
          paramIndex++;
          break;
        case 'teacher':
          whereClause = ` WHERE c.teacher_id = $${paramIndex}`;
          params.push(userId);
          paramIndex++;
          break;
        case 'parent':
          whereClause = ` WHERE s.parent_id = $${paramIndex}`;
          params.push(userId);
          paramIndex++;
          break;
        case 'student':
          whereClause = ` WHERE s.id = $${paramIndex}`;
          params.push(userId);
          paramIndex++;
          break;
        default:
          return res.status(403).json({ error: 'Access denied' });
      }
      
      // Add filters
      if (class_id) {
        whereClause += ` AND ast.class_id = $${paramIndex}`;
        params.push(class_id);
        paramIndex++;
      }
      if (student_id && userRole !== 'student') {
        whereClause += ` AND ast.student_id = $${paramIndex}`;
        params.push(student_id);
        paramIndex++;
      }
      if (semester_id) {
        whereClause += ` AND ast.semester_id = $${paramIndex}`;
        params.push(semester_id);
        paramIndex++;
      }
      
      query += whereClause + ' ORDER BY u.first_name, u.last_name';
      const result = await pool.query(query, params);
      data = result.rows;
      
    } else {
      // Export detailed records - similar implementation
      return res.status(501).json({ error: 'Detailed export not yet implemented' });
    }
    
    if (format === 'csv') {
      if (data.length === 0) {
        return res.status(404).json({ error: 'No data found' });
      }
      
      // Convert to CSV
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
      res.send(csv);
      
    } else if (format === 'json') {
      res.json({
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        data
      });
    }
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;