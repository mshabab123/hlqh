const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');

// Initialize points table
const initializePointsTable = async () => {
  try {
    // Create daily_points table
    await db.query(`
      CREATE TABLE IF NOT EXISTS daily_points (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL,
        teacher_id VARCHAR(20) NOT NULL,
        class_id UUID NOT NULL,
        semester_id INTEGER NOT NULL,
        points_date DATE NOT NULL,
        points_given DECIMAL(2,1) NOT NULL CHECK (points_given >= 0 AND points_given <= 5),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign key constraints
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        
        -- Unique constraint to prevent duplicate points for same student on same day by same teacher
        UNIQUE(student_id, teacher_id, class_id, semester_id, points_date)
      );
    `);

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_points_student_semester 
      ON daily_points(student_id, semester_id);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_points_teacher_date 
      ON daily_points(teacher_id, points_date);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_points_class_date 
      ON daily_points(class_id, points_date);
    `);

    console.log('Points system initialized successfully');
  } catch (error) {
    console.error('Error initializing points system:', error);
  }
};

// Initialize table on module load
initializePointsTable();

// GET /api/points/student/:studentId - Get all points for a specific student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { semester_id, date_from, date_to, page = 1, limit = 50 } = req.query;
    
    // Check if user can view this student's points
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    if (userRole === 'student' && userId !== studentId) {
      return res.status(403).json({ error: 'لا يمكنك عرض نقاط طالب آخر' });
    }
    
    if (userRole === 'teacher') {
      // Teachers can only see points for students in their classes
      const teacherClassCheck = await db.query(`
        SELECT DISTINCT se.student_id 
        FROM student_enrollments se
        JOIN teacher_class_assignments tca ON se.class_id = tca.class_id
        WHERE tca.teacher_id = $1 AND tca.is_active = true 
        AND se.student_id = $2 AND se.status = 'enrolled'
      `, [userId, studentId]);
      
      if (teacherClassCheck.rows.length === 0) {
        return res.status(403).json({ error: 'لا يمكنك عرض نقاط هذا الطالب' });
      }
    }
    
    let query = `
      SELECT 
        dp.*,
        u.first_name || ' ' || u.last_name as teacher_name,
        c.name as class_name,
        s.display_name as semester_name,
        su.first_name || ' ' || su.last_name as student_name
      FROM daily_points dp
      JOIN users u ON dp.teacher_id = u.id
      JOIN classes c ON dp.class_id = c.id
      JOIN semesters s ON dp.semester_id = s.id
      JOIN users su ON dp.student_id = su.id AND su.role = 'student'
      WHERE dp.student_id = $1
    `;
    
    const params = [studentId];
    let paramIndex = 2;
    
    if (semester_id) {
      query += ` AND dp.semester_id = $${paramIndex}`;
      params.push(semester_id);
      paramIndex++;
    }
    
    if (date_from) {
      query += ` AND dp.points_date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    
    if (date_to) {
      query += ` AND dp.points_date <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    
    query += ` ORDER BY dp.points_date DESC, dp.created_at DESC`;
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Get total points summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_entries,
        SUM(points_given) as total_points,
        AVG(points_given) as average_points,
        MAX(points_given) as max_points,
        MIN(points_given) as min_points
      FROM daily_points 
      WHERE student_id = $1
      ${semester_id ? `AND semester_id = ${semester_id}` : ''}
      ${date_from ? `AND points_date >= '${date_from}'` : ''}
      ${date_to ? `AND points_date <= '${date_to}'` : ''}
    `;
    
    const summaryResult = await db.query(summaryQuery, [studentId]);
    
    res.json({
      points: result.rows,
      summary: summaryResult.rows[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(summaryResult.rows[0].total_entries)
      }
    });
    
  } catch (error) {
    console.error('Error fetching student points:', error);
    res.status(500).json({ error: 'فشل في جلب نقاط الطالب' });
  }
});

// GET /api/points/class/:classId - Get points for all students in a class (for teachers)
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { semester_id, points_date, page = 1, limit = 100 } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    // Check if user can view this class
    if (userRole === 'teacher') {
      const teacherCheck = await db.query(`
        SELECT id FROM teacher_class_assignments 
        WHERE teacher_id = $1 AND class_id = $2 AND is_active = true
      `, [userId, classId]);
      
      if (teacherCheck.rows.length === 0) {
        return res.status(403).json({ error: 'لا يمكنك عرض نقاط هذا الصف' });
      }
    } else if (!['admin', 'administrator', 'supervisor'].includes(userRole)) {
      return res.status(403).json({ error: 'غير مصرح لك بعرض نقاط الصفوف' });
    }
    
    let query = `
      SELECT 
        dp.id,
        dp.student_id,
        dp.points_given,
        dp.points_date,
        dp.notes,
        dp.created_at,
        su.first_name || ' ' || su.last_name as student_name,
        u.first_name || ' ' || u.last_name as teacher_name
      FROM daily_points dp
      JOIN users su ON dp.student_id = su.id AND su.role = 'student'
      JOIN users u ON dp.teacher_id = u.id
      WHERE dp.class_id = $1
    `;
    
    const params = [classId];
    let paramIndex = 2;
    
    if (semester_id) {
      query += ` AND dp.semester_id = $${paramIndex}`;
      params.push(semester_id);
      paramIndex++;
    }
    
    if (points_date) {
      query += ` AND dp.points_date = $${paramIndex}`;
      params.push(points_date);
      paramIndex++;
    }
    
    query += ` ORDER BY su.first_name, su.last_name, dp.points_date DESC`;
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    res.json({
      points: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching class points:', error);
    res.status(500).json({ error: 'فشل في جلب نقاط الصف' });
  }
});

// POST /api/points - Give points to a student
router.post('/', auth, async (req, res) => {
  try {
    const { student_id, class_id, semester_id, points_date, points_given, notes } = req.body;
    const teacher_id = req.user.id;
    const userRole = req.user?.role;
    
    // Only authorized roles can give points
    const allowedRoles = ['admin', 'administrator', 'supervisor', 'teacher'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'غير مصرح لك بإعطاء النقاط' });
    }
    
    // Validate required fields
    if (!student_id || !class_id || !semester_id || !points_date || points_given === undefined) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    // Validate points range (0 to 5, with 0.5 increments)
    const pointsNum = parseFloat(points_given);
    if (isNaN(pointsNum) || pointsNum < 0 || pointsNum > 5 || (pointsNum * 2) % 1 !== 0) {
      return res.status(400).json({ error: 'النقاط يجب أن تكون بين 0 و 5 بزيادات نصف نقطة' });
    }
    
    // Check permissions based on role
    if (userRole === 'teacher') {
      // Teachers can only give points to students in classes they teach
      const teacherClassCheck = await db.query(`
        SELECT id FROM teacher_class_assignments 
        WHERE teacher_id = $1 AND class_id = $2 AND is_active = true
      `, [teacher_id, class_id]);
      
      if (teacherClassCheck.rows.length === 0) {
        return res.status(403).json({ error: 'لا يمكنك إعطاء نقاط لطلاب هذا الصف' });
      }
    } else if (userRole === 'administrator') {
      // Administrators can give points to students in classes within their school
      const adminClassCheck = await db.query(`
        SELECT c.id FROM classes c
        JOIN administrators a ON c.school_id = a.school_id
        WHERE a.id = $1 AND c.id = $2 AND c.is_active = true
      `, [teacher_id, class_id]);
      
      if (adminClassCheck.rows.length === 0) {
        return res.status(403).json({ error: 'لا يمكنك إعطاء نقاط لطلاب هذا الصف' });
      }
    } else if (userRole === 'supervisor') {
      // Supervisors can give points to students in classes within their school
      const supervisorClassCheck = await db.query(`
        SELECT c.id FROM classes c
        JOIN supervisors s ON c.school_id = s.school_id
        WHERE s.id = $1 AND c.id = $2 AND c.is_active = true
      `, [teacher_id, class_id]);
      
      if (supervisorClassCheck.rows.length === 0) {
        return res.status(403).json({ error: 'لا يمكنك إعطاء نقاط لطلاب هذا الصف' });
      }
    }
    // Admins can give points to any student in any class (no additional check needed)
    
    // Check if student is enrolled in this class and is active
    const studentCheck = await db.query(`
      SELECT se.id, u.is_active 
      FROM student_enrollments se
      JOIN users u ON se.student_id = u.id
      WHERE se.student_id = $1 AND se.class_id = $2 AND se.status = 'enrolled'
    `, [student_id, class_id]);
    
    if (studentCheck.rows.length === 0) {
      return res.status(400).json({ error: 'الطالب غير مسجل في هذا الصف' });
    }
    
    const studentData = studentCheck.rows[0];
    if (!studentData.is_active) {
      return res.status(400).json({ error: 'لا يمكن إعطاء نقاط لطالب غير مفعل' });
    }
    
    // Check if points already given for this student on this date by this teacher
    const existingPoints = await db.query(`
      SELECT id FROM daily_points 
      WHERE student_id = $1 AND teacher_id = $2 AND class_id = $3 
      AND semester_id = $4 AND points_date = $5
    `, [student_id, teacher_id, class_id, semester_id, points_date]);
    
    let result;
    
    if (existingPoints.rows.length > 0) {
      // Update existing points
      result = await db.query(`
        UPDATE daily_points 
        SET points_given = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE student_id = $3 AND teacher_id = $4 AND class_id = $5 
        AND semester_id = $6 AND points_date = $7
        RETURNING *
      `, [pointsNum, notes, student_id, teacher_id, class_id, semester_id, points_date]);
    } else {
      // Insert new points
      result = await db.query(`
        INSERT INTO daily_points 
        (student_id, teacher_id, class_id, semester_id, points_date, points_given, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [student_id, teacher_id, class_id, semester_id, points_date, pointsNum, notes]);
    }
    
    res.status(201).json({
      message: 'تم إعطاء النقاط بنجاح',
      points: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error giving points:', error);
    res.status(500).json({ error: 'فشل في إعطاء النقاط' });
  }
});

// PUT /api/points/:id - Update points (for teachers)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { points_given, notes } = req.body;
    const teacher_id = req.user.id;
    const userRole = req.user?.role;
    
    // Only authorized roles can update points
    const allowedRoles = ['admin', 'administrator', 'supervisor', 'teacher'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'غير مصرح لك بتحديث النقاط' });
    }
    
    // Validate points range
    const pointsNum = parseFloat(points_given);
    if (isNaN(pointsNum) || pointsNum < 0 || pointsNum > 5 || (pointsNum * 2) % 1 !== 0) {
      return res.status(400).json({ error: 'النقاط يجب أن تكون بين 0 و 5 بزيادات نصف نقطة' });
    }
    
    // Check permissions based on role
    if (userRole === 'teacher') {
      // Teachers can only update points they gave
      const pointsCheck = await db.query(`
        SELECT id FROM daily_points WHERE id = $1 AND teacher_id = $2
      `, [id, teacher_id]);
      
      if (pointsCheck.rows.length === 0) {
        return res.status(403).json({ error: 'لا يمكنك تحديث نقاط معلم آخر' });
      }
    } else {
      // Admins, administrators, and supervisors can update any points
      const pointsCheck = await db.query(`
        SELECT id FROM daily_points WHERE id = $1
      `, [id]);
      
      if (pointsCheck.rows.length === 0) {
        return res.status(404).json({ error: 'النقاط غير موجودة' });
      }
    }
    
    const result = await db.query(`
      UPDATE daily_points 
      SET points_given = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [pointsNum, notes, id]);
    
    res.json({
      message: 'تم تحديث النقاط بنجاح',
      points: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).json({ error: 'فشل في تحديث النقاط' });
  }
});

// DELETE /api/points/:id - Delete points (for teachers)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher_id = req.user.id;
    const userRole = req.user?.role;
    
    // Only authorized roles can delete points
    const allowedRoles = ['admin', 'administrator', 'supervisor', 'teacher'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'غير مصرح لك بحذف النقاط' });
    }
    
    // Check if this teacher gave these points (teachers can only delete their own)
    if (userRole === 'teacher') {
      const pointsCheck = await db.query(`
        SELECT id FROM daily_points WHERE id = $1 AND teacher_id = $2
      `, [id, teacher_id]);
      
      if (pointsCheck.rows.length === 0) {
        return res.status(403).json({ error: 'لا يمكنك حذف نقاط معلم آخر' });
      }
    }
    
    const result = await db.query(`
      DELETE FROM daily_points WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'النقاط غير موجودة' });
    }
    
    res.json({ message: 'تم حذف النقاط بنجاح' });
    
  } catch (error) {
    console.error('Error deleting points:', error);
    res.status(500).json({ error: 'فشل في حذف النقاط' });
  }
});

// GET /api/points/teacher/my-classes - Get all classes for current user with student counts
router.get('/teacher/my-classes', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user?.role;
    
    const allowedRoles = ['admin', 'administrator', 'supervisor', 'teacher'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول لهذه البيانات' });
    }
    
    let query, params;
    
    if (userRole === 'teacher') {
      // Teachers see only their assigned classes
      query = `
        SELECT 
          c.id,
          c.name,
          s.name as school_name,
          COUNT(se.student_id) as student_count
        FROM teacher_class_assignments tca
        JOIN classes c ON tca.class_id = c.id
        JOIN schools s ON c.school_id = s.id
        LEFT JOIN student_enrollments se ON c.id = se.class_id AND se.status = 'enrolled'
        WHERE tca.teacher_id = $1 AND tca.is_active = true AND c.is_active = true
        GROUP BY c.id, c.name, s.name
        ORDER BY s.name, c.name
      `;
      params = [userId];
    } else if (userRole === 'administrator') {
      // Administrators see classes in their school
      query = `
        SELECT 
          c.id,
          c.name,
          s.name as school_name,
          COUNT(se.student_id) as student_count
        FROM classes c
        JOIN schools s ON c.school_id = s.id
        JOIN administrators a ON s.id = a.school_id
        LEFT JOIN student_enrollments se ON c.id = se.class_id AND se.status = 'enrolled'
        WHERE a.id = $1 AND c.is_active = true
        GROUP BY c.id, c.name, s.name
        ORDER BY s.name, c.name
      `;
      params = [userId];
    } else if (userRole === 'supervisor') {
      // Supervisors see classes in their school
      query = `
        SELECT 
          c.id,
          c.name,
          s.name as school_name,
          COUNT(se.student_id) as student_count
        FROM classes c
        JOIN schools s ON c.school_id = s.id
        JOIN supervisors sup ON s.id = sup.school_id
        LEFT JOIN student_enrollments se ON c.id = se.class_id AND se.status = 'enrolled'
        WHERE sup.id = $1 AND c.is_active = true
        GROUP BY c.id, c.name, s.name
        ORDER BY s.name, c.name
      `;
      params = [userId];
    } else if (userRole === 'admin') {
      // Admins see all classes
      query = `
        SELECT 
          c.id,
          c.name,
          s.name as school_name,
          COUNT(se.student_id) as student_count
        FROM classes c
        JOIN schools s ON c.school_id = s.id
        LEFT JOIN student_enrollments se ON c.id = se.class_id AND se.status = 'enrolled'
        WHERE c.is_active = true
        GROUP BY c.id, c.name, s.name
        ORDER BY s.name, c.name
      `;
      params = [];
    }
    
    const result = await db.query(query, params);
    
    res.json({ classes: result.rows });
    
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'فشل في جلب الصفوف' });
  }
});

module.exports = router;