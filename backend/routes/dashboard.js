const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let stats = {};
    
    if (userRole === 'admin') {
      // Admin gets system-wide statistics
      const [
        studentCount,
        teacherCount,
        classCount,
        schoolCount,
        administratorCount,
        parentCount
      ] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = true"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND is_active = true"),
        pool.query("SELECT COUNT(*) as count FROM classes"),
        pool.query("SELECT COUNT(*) as count FROM schools"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'administrator' AND is_active = true"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'parent' AND is_active = true")
      ]);
      
      stats = {
        students: parseInt(studentCount.rows[0].count),
        teachers: parseInt(teacherCount.rows[0].count),
        classes: parseInt(classCount.rows[0].count),
        schools: parseInt(schoolCount.rows[0].count),
        administrators: parseInt(administratorCount.rows[0].count),
        parents: parseInt(parentCount.rows[0].count)
      };
      
    } else if (userRole === 'administrator') {
      // Administrator gets statistics for their school only
      const [
        studentCount,
        teacherCount,
        classCount
      ] = await Promise.all([
        pool.query(`
          SELECT COUNT(DISTINCT u.id) as count
          FROM users u
          JOIN students s ON u.id = s.id
          JOIN classes c ON s.class_id = c.id
          JOIN administrators a ON c.school_id = a.school_id
          WHERE u.role = 'student' 
            AND u.is_active = true 
            AND a.id = $1
        `, [userId]),
        pool.query(`
          SELECT COUNT(DISTINCT u.id) as count
          FROM users u
          JOIN teachers t ON u.id = t.id
          JOIN administrators a ON t.school_id = a.school_id
          WHERE u.role = 'teacher' 
            AND u.is_active = true 
            AND a.id = $1
        `, [userId]),
        pool.query(`
          SELECT COUNT(*) as count
          FROM classes c
          JOIN administrators a ON c.school_id = a.school_id
          WHERE a.id = $1
        `, [userId])
      ]);
      
      // Get school name
      const schoolResult = await pool.query(`
        SELECT s.name as school_name
        FROM schools s
        JOIN administrators a ON s.id = a.school_id
        WHERE a.id = $1
      `, [userId]);
      
      stats = {
        students: parseInt(studentCount.rows[0].count),
        teachers: parseInt(teacherCount.rows[0].count),
        classes: parseInt(classCount.rows[0].count),
        schoolName: schoolResult.rows[0]?.school_name || 'مجمع غير محدد'
      };
      
    } else if (userRole === 'supervisor') {
      // Supervisor gets statistics for their school
      const [
        studentCount,
        teacherCount,
        classCount
      ] = await Promise.all([
        pool.query(`
          SELECT COUNT(DISTINCT u.id) as count
          FROM users u
          JOIN students s ON u.id = s.id
          JOIN classes c ON s.class_id = c.id
          JOIN supervisors sup ON c.school_id = sup.school_id
          WHERE u.role = 'student' 
            AND u.is_active = true 
            AND sup.id = $1
        `, [userId]),
        pool.query(`
          SELECT COUNT(DISTINCT u.id) as count
          FROM users u
          JOIN teachers t ON u.id = t.id
          JOIN supervisors sup ON t.school_id = sup.school_id
          WHERE u.role = 'teacher' 
            AND u.is_active = true 
            AND sup.id = $1
        `, [userId]),
        pool.query(`
          SELECT COUNT(*) as count
          FROM classes c
          JOIN supervisors sup ON c.school_id = sup.school_id
          WHERE sup.id = $1
        `, [userId])
      ]);
      
      stats = {
        students: parseInt(studentCount.rows[0].count),
        teachers: parseInt(teacherCount.rows[0].count),
        classes: parseInt(classCount.rows[0].count)
      };
      
    } else if (userRole === 'teacher') {
      // Teacher gets statistics for their classes only
      const [
        studentCount,
        classCount
      ] = await Promise.all([
        pool.query(`
          SELECT COUNT(DISTINCT s.id) as count
          FROM students s
          JOIN classes c ON s.class_id = c.id
          JOIN teachers t ON c.teacher_id = t.id
          JOIN users u ON s.id = u.id
          WHERE t.id = $1 AND u.is_active = true
        `, [userId]),
        pool.query(`
          SELECT COUNT(*) as count
          FROM classes c
          WHERE c.teacher_id = $1
        `, [userId])
      ]);
      
      stats = {
        students: parseInt(studentCount.rows[0].count),
        classes: parseInt(classCount.rows[0].count)
      };
      
    } else if (userRole === 'parent') {
      // Parent gets statistics for their children
      const childrenCount = await pool.query(`
        SELECT COUNT(*) as count
        FROM students s
        JOIN users u ON s.id = u.id
        WHERE s.parent_id = $1 AND u.is_active = true
      `, [userId]);
      
      stats = {
        children: parseInt(childrenCount.rows[0].count)
      };
      
    } else {
      // Student gets their own basic info
      stats = {
        profile: true
      };
    }
    
    res.json({ stats, userRole });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// GET /api/dashboard/activities - Get recent activities based on user role
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const limit = req.query.limit || 10;
    
    let activities = [];
    
    if (userRole === 'admin') {
      // Admin sees system-wide activities
      const recentUsers = await pool.query(`
        SELECT 
          'user_created' as type,
          u.first_name, u.last_name, u.role, u.created_at,
          'تم تسجيل ' || 
          CASE 
            WHEN u.role = 'student' THEN 'طالب جديد'
            WHEN u.role = 'teacher' THEN 'معلم جديد' 
            WHEN u.role = 'parent' THEN 'ولي أمر جديد'
            WHEN u.role = 'administrator' THEN 'مدير جديد'
            ELSE 'مستخدم جديد'
          END as description
        FROM users u 
        WHERE u.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY u.created_at DESC 
        LIMIT $1
      `, [limit]);
      
      activities = recentUsers.rows.map(activity => ({
        type: activity.type,
        title: activity.description,
        subtitle: `${activity.first_name} ${activity.last_name}`,
        time: activity.created_at,
        icon: activity.role === 'student' ? 'student' : 
              activity.role === 'teacher' ? 'teacher' :
              activity.role === 'parent' ? 'parent' : 'user'
      }));
      
    } else if (userRole === 'administrator') {
      // Administrator sees activities in their school
      const schoolActivities = await pool.query(`
        SELECT 
          'student_enrolled' as type,
          u.first_name, u.last_name, c.name as class_name, s.created_at,
          'تم تسجيل الطالب في الحلقة' as description
        FROM students s
        JOIN users u ON s.id = u.id
        JOIN classes c ON s.class_id = c.id
        JOIN administrators a ON c.school_id = a.school_id
        WHERE a.id = $1 
          AND s.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY s.created_at DESC 
        LIMIT $2
      `, [userId, limit]);
      
      activities = schoolActivities.rows.map(activity => ({
        type: activity.type,
        title: activity.description,
        subtitle: `${activity.first_name} ${activity.last_name} - ${activity.class_name}`,
        time: activity.created_at,
        icon: 'student'
      }));
      
    } else if (userRole === 'supervisor') {
      // Supervisor sees activities in their school
      const supervisorActivities = await pool.query(`
        SELECT 
          'student_enrolled' as type,
          u.first_name, u.last_name, c.name as class_name, s.created_at,
          'تم تسجيل الطالب في الحلقة' as description
        FROM students s
        JOIN users u ON s.id = u.id
        JOIN classes c ON s.class_id = c.id
        JOIN supervisors sup ON c.school_id = sup.school_id
        WHERE sup.id = $1 
          AND s.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY s.created_at DESC 
        LIMIT $2
      `, [userId, limit]);
      
      activities = supervisorActivities.rows.map(activity => ({
        type: activity.type,
        title: activity.description,
        subtitle: `${activity.first_name} ${activity.last_name} - ${activity.class_name}`,
        time: activity.created_at,
        icon: 'student'
      }));
      
    } else if (userRole === 'teacher') {
      // Teacher sees activities in their classes
      const teacherActivities = await pool.query(`
        SELECT 
          'student_enrolled' as type,
          u.first_name, u.last_name, c.name as class_name, s.created_at,
          'انضم طالب جديد لحلقتك' as description
        FROM students s
        JOIN users u ON s.id = u.id
        JOIN classes c ON s.class_id = c.id
        WHERE c.teacher_id = $1 
          AND s.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY s.created_at DESC 
        LIMIT $2
      `, [userId, limit]);
      
      activities = teacherActivities.rows.map(activity => ({
        type: activity.type,
        title: activity.description,
        subtitle: `${activity.first_name} ${activity.last_name} - ${activity.class_name}`,
        time: activity.created_at,
        icon: 'student'
      }));
      
    } else if (userRole === 'parent') {
      // Parent sees their children's activities (grades, attendance, etc.)
      const parentActivities = await pool.query(`
        SELECT 
          'child_activity' as type,
          u.first_name, u.last_name, c.name as class_name, s.created_at,
          'تم تحديث بيانات الطالب' as description
        FROM students s
        JOIN users u ON s.id = u.id
        JOIN classes c ON s.class_id = c.id
        WHERE s.parent_id = $1
        ORDER BY s.updated_at DESC 
        LIMIT $2
      `, [userId, limit]);
      
      activities = parentActivities.rows.map(activity => ({
        type: activity.type,
        title: activity.description,
        subtitle: `${activity.first_name} ${activity.last_name} - ${activity.class_name}`,
        time: activity.created_at,
        icon: 'child'
      }));
      
    } else {
      // Student sees their own activities
      activities = [{
        type: 'profile',
        title: 'مرحباً بك في النظام',
        subtitle: 'يمكنك مراجعة بياناتك الشخصية ودرجاتك',
        time: new Date(),
        icon: 'student'
      }];
    }
    
    res.json({ activities });
    
  } catch (error) {
    console.error('Dashboard activities error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

module.exports = router;