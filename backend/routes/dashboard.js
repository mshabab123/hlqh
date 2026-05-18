const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { QURAN_SURAHS, TOTAL_QURAN_PAGES } = require('../utils/quranUtils');

const getSurah = (surahId) => QURAN_SURAHS.find((surah) => surah.id === Number(surahId));

const calculateExactPageNumber = (surahId, ayahNumber) => {
  const surah = getSurah(surahId);
  if (!surah) return 0;

  const ayah = Number(ayahNumber) || 1;
  if (ayah >= surah.ayahCount) return surah.endPage;

  const ayahProgress = ayah / surah.ayahCount;
  const pageWithinSurah = ayahProgress * (surah.endPage - surah.startPage + 1);
  return Number((surah.startPage + pageWithinSurah - 1).toFixed(1));
};

const parseQuranReference = (reference) => {
  if (!reference || typeof reference !== 'string') return null;

  const [surahPart, ayahPart] = reference.split(':');
  const surahId = Number(surahPart);
  const surah = getSurah(surahId);
  if (!surah) return null;

  const ayahNumber = ayahPart === 'end'
    ? surah.ayahCount
    : Math.max(1, Math.min(Number(ayahPart) || 1, surah.ayahCount));

  return {
    surahId,
    ayahNumber,
    page: calculateExactPageNumber(surahId, ayahNumber),
  };
};

const countPagesBetweenReferences = (startReference, endReference) => {
  const start = parseQuranReference(startReference);
  const end = parseQuranReference(endReference);
  if (!start || !end || !start.page || !end.page) return 0;

  const minPage = Math.max(1, Math.min(Math.round(start.page), Math.round(end.page)));
  const maxPage = Math.min(TOTAL_QURAN_PAGES, Math.max(Math.round(start.page), Math.round(end.page)));
  return Math.max(0, maxPage - minPage + 1);
};

const classifyQuranCourse = (courseName = '', gradeType = '') => {
  const text = `${courseName} ${gradeType}`.toLowerCase();
  if (text.includes('مراجع') || text.includes('review') || text.includes('revision')) return 'review';
  if (text.includes('حفظ') || text.includes('memor') || text.includes('new')) return 'memorized';
  return 'other';
};

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

// GET /api/dashboard/quran-semester-pages - Quran page totals recorded in a semester
router.get('/quran-semester-pages', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!['admin', 'administrator', 'supervisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Not authorized to view Quran semester page totals.' });
    }

    let schoolId = null;
    if (userRole === 'administrator') {
      const schoolResult = await pool.query('SELECT school_id FROM administrators WHERE id = $1', [userId]);
      schoolId = schoolResult.rows[0]?.school_id || null;
    } else if (userRole === 'supervisor') {
      const schoolResult = await pool.query('SELECT school_id FROM supervisors WHERE id = $1', [userId]);
      schoolId = schoolResult.rows[0]?.school_id || null;
    }

    let semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
    if (!semesterId) {
      const semesterResult = await pool.query(`
        SELECT id
        FROM semesters
        WHERE ($1::int IS NULL OR school_id = $1)
        ORDER BY
          CASE WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 0 ELSE 1 END,
          start_date DESC NULLS LAST,
          id DESC
        LIMIT 1
      `, [schoolId]);

      semesterId = semesterResult.rows[0]?.id || null;
    }

    if (!semesterId) {
      return res.json({
        semester: null,
        totals: { memorized_pages: 0, review_pages: 0, other_pages: 0, total_pages: 0, records: 0 },
        by_school: [],
        by_class: [],
      });
    }

    const result = await pool.query(`
      SELECT
        g.id,
        g.start_reference,
        g.end_reference,
        g.grade_type,
        COALESCE(sc.name, '') as course_name,
        c.id as class_id,
        c.name as class_name,
        sch.id as school_id,
        sch.name as school_name,
        sem.id as semester_id,
        sem.display_name as semester_name,
        sem.start_date,
        sem.end_date
      FROM grades g
      LEFT JOIN semester_courses sc ON sc.id = g.course_id
      LEFT JOIN classes c ON c.id = g.class_id
      LEFT JOIN schools sch ON sch.id = COALESCE(c.school_id, sc.school_id)
      JOIN semesters sem ON sem.id = g.semester_id
      WHERE g.semester_id = $1
        AND ($2::int IS NULL OR COALESCE(c.school_id, sc.school_id) = $2)
        AND g.start_reference IS NOT NULL
        AND g.end_reference IS NOT NULL
        AND (
          g.grade_type = 'memorization'
          OR sc.requires_surah = true
          OR sc.name ILIKE '%حفظ%'
          OR sc.name ILIKE '%مراجع%'
        )
      ORDER BY sch.name, c.name
    `, [semesterId, schoolId]);

    const totals = {
      memorized_pages: 0,
      review_pages: 0,
      other_pages: 0,
      total_pages: 0,
      records: 0,
    };
    const bySchoolMap = new Map();
    const byClassMap = new Map();

    result.rows.forEach((row) => {
      const pageCount = countPagesBetweenReferences(row.start_reference, row.end_reference);
      if (pageCount <= 0) return;

      const category = classifyQuranCourse(row.course_name, row.grade_type);
      const totalKey = category === 'review'
        ? 'review_pages'
        : category === 'memorized'
          ? 'memorized_pages'
          : 'other_pages';

      totals[totalKey] += pageCount;
      totals.total_pages += pageCount;
      totals.records += 1;

      const schoolKey = row.school_id || 'unknown';
      if (!bySchoolMap.has(schoolKey)) {
        bySchoolMap.set(schoolKey, {
          school_id: row.school_id,
          school_name: row.school_name || 'غير محدد',
          memorized_pages: 0,
          review_pages: 0,
          other_pages: 0,
          total_pages: 0,
          records: 0,
        });
      }
      const school = bySchoolMap.get(schoolKey);
      school[totalKey] += pageCount;
      school.total_pages += pageCount;
      school.records += 1;

      const classKey = row.class_id || `unknown-${schoolKey}`;
      if (!byClassMap.has(classKey)) {
        byClassMap.set(classKey, {
          class_id: row.class_id,
          class_name: row.class_name || 'غير محدد',
          school_name: row.school_name || 'غير محدد',
          memorized_pages: 0,
          review_pages: 0,
          other_pages: 0,
          total_pages: 0,
          records: 0,
        });
      }
      const classSummary = byClassMap.get(classKey);
      classSummary[totalKey] += pageCount;
      classSummary.total_pages += pageCount;
      classSummary.records += 1;
    });

    const semester = result.rows[0]
      ? {
          id: result.rows[0].semester_id,
          display_name: result.rows[0].semester_name,
          start_date: result.rows[0].start_date,
          end_date: result.rows[0].end_date,
        }
      : (await pool.query('SELECT id, display_name, start_date, end_date FROM semesters WHERE id = $1', [semesterId])).rows[0] || null;

    res.json({
      semester,
      totals,
      by_school: Array.from(bySchoolMap.values()).sort((a, b) => b.total_pages - a.total_pages),
      by_class: Array.from(byClassMap.values()).sort((a, b) => b.total_pages - a.total_pages),
    });
  } catch (error) {
    console.error('Quran semester pages error:', error);
    res.status(500).json({ error: 'Failed to fetch Quran semester page totals' });
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
