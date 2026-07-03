const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { canAccessSchool, canAccessStudent } = require('../utils/accessScope');

const router = express.Router();
const MANAGER_ROLES = ['admin', 'administrator'];

function isCertificateManager(user) {
  return MANAGER_ROLES.includes(user?.role);
}

function requireCertificateManager(req, res, next) {
  if (!isCertificateManager(req.user)) {
    return res.status(403).json({ error: 'هذه الصلاحية متاحة للمدير أو الأدمن فقط' });
  }
  next();
}

async function getSemester(req, res, semesterId) {
  const result = await db.query(
    `SELECT sem.*, sch.name as school_name
     FROM semesters sem
     LEFT JOIN schools sch ON sch.id = sem.school_id
     WHERE sem.id = $1`,
    [semesterId]
  );

  const semester = result.rows[0];
  if (!semester) {
    res.status(404).json({ error: 'الفصل الدراسي غير موجود' });
    return null;
  }

  if (!(await canAccessSchool(db, req.user, semester.school_id))) {
    res.status(403).json({ error: 'ليس لديك صلاحية على هذا الفصل الدراسي' });
    return null;
  }

  return semester;
}

const studentCertificateListQuery = `
  WITH semester_students AS (
    SELECT DISTINCT ON (student_id)
      student_id,
      class_id,
      created_at
    FROM (
      SELECT sr.student_id, sr.class_id, sr.created_at
      FROM semester_registrations sr
      WHERE sr.semester_id = $1
        AND sr.status <> 'cancelled'

      UNION ALL

      SELECT se.student_id, se.class_id, se.enrollment_date as created_at
      FROM student_enrollments se
      JOIN classes c ON c.id = se.class_id
      WHERE c.semester_id = $1
        AND se.status = 'enrolled'
    ) registered
    ORDER BY student_id, class_id NULLS LAST, created_at DESC NULLS LAST
  ),
  grade_summary AS (
    SELECT
      g.student_id,
      COUNT(*)::int as grade_count,
      ROUND(AVG(
        CASE
          WHEN g.max_grade IS NOT NULL AND g.max_grade > 0
            THEN (g.grade_value::numeric / g.max_grade::numeric) * 100
          ELSE g.grade_value::numeric
        END
      )::numeric, 2) as average_grade,
      ROUND(SUM(
        CASE
          WHEN g.max_grade IS NOT NULL AND g.max_grade > 0
            THEN (g.grade_value::numeric / g.max_grade::numeric) * 100
          ELSE g.grade_value::numeric
        END
      )::numeric, 2) as total_grade
    FROM grades g
    WHERE g.semester_id = $1
      AND g.grade_value IS NOT NULL
    GROUP BY g.student_id
  )
  SELECT
    ss.student_id,
    CONCAT_WS(' ', u.first_name, u.second_name, u.third_name, u.last_name) as student_name,
    st.school_level,
    c.id as class_id,
    c.name as class_name,
    COALESCE(c.school_id, sem.school_id) as school_id,
    COALESCE(sch.name, sem_sch.name) as school_name,
    sem.display_name as semester_name,
    sem.type as semester_type,
    sem.year as semester_year,
    to_char(sem.start_date, 'YYYY-MM-DD') as semester_start_date,
    to_char(sem.end_date, 'YYYY-MM-DD') as semester_end_date,
    CONCAT_WS(' ', tu.first_name, tu.second_name, tu.third_name, tu.last_name) as teacher_name,
    COALESCE(gs.grade_count, 0) as grade_count,
    COALESCE(gs.average_grade, 0) as average_grade,
    COALESCE(gs.total_grade, 0) as total_grade,
    cert.id as certificate_id,
    cert.certificate_number,
    cert.status as certificate_status,
    cert.issued_at,
    cert.revoked_at,
    cert.revoke_reason,
    cert.notes as certificate_notes
  FROM semester_students ss
  JOIN users u ON u.id = ss.student_id
  JOIN students st ON st.id = ss.student_id
  JOIN semesters sem ON sem.id = $1
  LEFT JOIN schools sem_sch ON sem_sch.id = sem.school_id
  LEFT JOIN classes c ON c.id = ss.class_id
  LEFT JOIN schools sch ON sch.id = c.school_id
  LEFT JOIN teacher_class_assignments tca
    ON tca.class_id = c.id
   AND tca.teacher_role = 'primary'
   AND tca.is_active = true
  LEFT JOIN users tu ON tu.id = tca.teacher_id
  LEFT JOIN grade_summary gs ON gs.student_id = ss.student_id
  LEFT JOIN student_certificates cert
    ON cert.semester_id = $1
   AND cert.student_id = ss.student_id
  ORDER BY c.name NULLS LAST, u.first_name, u.second_name, u.last_name
`;

async function listSemesterStudents(semesterId) {
  const result = await db.query(studentCertificateListQuery, [semesterId]);
  return result.rows;
}

function buildCertificatePayload(row, semester, notes) {
  return {
    student_id: row.student_id,
    student_name: row.student_name,
    school_level: row.school_level,
    school_id: row.school_id || semester.school_id,
    school_name: row.school_name || semester.school_name,
    class_id: row.class_id,
    class_name: row.class_name,
    teacher_name: row.teacher_name,
    semester_id: semester.id,
    semester_name: row.semester_name || semester.display_name,
    semester_year: row.semester_year || semester.year,
    average_grade: Number(row.average_grade || 0),
    total_grade: Number(row.total_grade || 0),
    grade_count: Number(row.grade_count || 0),
    notes: notes || null,
  };
}

router.get('/semesters/:semesterId/students', authenticateToken, requireCertificateManager, async (req, res) => {
  try {
    const semester = await getSemester(req, res, req.params.semesterId);
    if (!semester) return;

    const students = await listSemesterStudents(req.params.semesterId);
    res.json({ semester, students });
  } catch (error) {
    console.error('Error fetching certificate students:', error);
    res.status(500).json({ error: 'فشل تحميل طلاب الشهادات' });
  }
});

router.post('/semesters/:semesterId/grant', authenticateToken, requireCertificateManager, async (req, res) => {
  let client;

  try {
    const semester = await getSemester(req, res, req.params.semesterId);
    if (!semester) return;

    const excludedIds = new Set((req.body.excluded_student_ids || []).map(String));
    const notes = req.body.notes || null;
    const students = await listSemesterStudents(req.params.semesterId);
    const eligibleStudents = students.filter((student) => {
      return !excludedIds.has(String(student.student_id)) && Number(student.grade_count || 0) > 0;
    });

    client = await db.connect();
    await client.query('BEGIN');
    const issued = [];

    for (const student of eligibleStudents) {
      const payload = buildCertificatePayload(student, semester, notes);
      const existingNumber = student.certificate_number;
      const certificateNumber = existingNumber || `CERT-${semester.id}-${student.student_id}-${Date.now()}`;

      const result = await client.query(
        `INSERT INTO student_certificates (
           semester_id, student_id, class_id, school_id, certificate_number,
           status, average_grade, total_grade, grade_count, issued_by, issued_at,
           revoked_by, revoked_at, revoke_reason, notes, payload, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, 'issued', $6, $7, $8, $9, NOW(), NULL, NULL, NULL, $10, $11::jsonb, NOW())
         ON CONFLICT (semester_id, student_id)
         DO UPDATE SET
           class_id = EXCLUDED.class_id,
           school_id = EXCLUDED.school_id,
           status = 'issued',
           average_grade = EXCLUDED.average_grade,
           total_grade = EXCLUDED.total_grade,
           grade_count = EXCLUDED.grade_count,
           issued_by = EXCLUDED.issued_by,
           issued_at = NOW(),
           revoked_by = NULL,
           revoked_at = NULL,
           revoke_reason = NULL,
           notes = EXCLUDED.notes,
           payload = EXCLUDED.payload,
           updated_at = NOW()
         RETURNING *`,
        [
          semester.id,
          student.student_id,
          student.class_id || null,
          student.school_id || semester.school_id,
          certificateNumber,
          student.average_grade || 0,
          student.total_grade || 0,
          student.grade_count || 0,
          req.user.id,
          notes,
          JSON.stringify(payload),
        ]
      );

      issued.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.json({
      message: 'تم منح الشهادات بنجاح',
      issued_count: issued.length,
      skipped_count: students.length - eligibleStudents.length,
      certificates: issued,
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error granting certificates:', error);
    res.status(500).json({ error: 'فشل منح الشهادات' });
  } finally {
    if (client) client.release();
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cert.*, sem.display_name as semester_name, sem.type as semester_type, sem.year as semester_year,
              sch.name as school_name, c.name as class_name,
              CONCAT_WS(' ', u.first_name, u.second_name, u.third_name, u.last_name) as student_name
       FROM student_certificates cert
       JOIN semesters sem ON sem.id = cert.semester_id
       LEFT JOIN schools sch ON sch.id = cert.school_id
       LEFT JOIN classes c ON c.id = cert.class_id
       JOIN users u ON u.id = cert.student_id
       WHERE cert.id = $1`,
      [req.params.id]
    );

    const certificate = result.rows[0];
    if (!certificate) {
      return res.status(404).json({ error: 'الشهادة غير موجودة' });
    }

    const canManage = isCertificateManager(req.user) && await canAccessSchool(db, req.user, certificate.school_id);
    const canViewStudent = await canAccessStudent(db, req.user, certificate.student_id);
    if (!canManage && !canViewStudent) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لعرض هذه الشهادة' });
    }

    res.json({ certificate });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: 'فشل تحميل الشهادة' });
  }
});

router.patch('/:id/revoke', authenticateToken, requireCertificateManager, async (req, res) => {
  try {
    const existing = await db.query('SELECT * FROM student_certificates WHERE id = $1', [req.params.id]);
    const certificate = existing.rows[0];
    if (!certificate) {
      return res.status(404).json({ error: 'الشهادة غير موجودة' });
    }

    if (!(await canAccessSchool(db, req.user, certificate.school_id))) {
      return res.status(403).json({ error: 'ليس لديك صلاحية على هذه الشهادة' });
    }

    const result = await db.query(
      `UPDATE student_certificates
       SET status = 'revoked',
           revoked_by = $2,
           revoked_at = NOW(),
           revoke_reason = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, req.user.id, req.body.reason || null]
    );

    res.json({ message: 'تم إلغاء الشهادة', certificate: result.rows[0] });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({ error: 'فشل إلغاء الشهادة' });
  }
});

module.exports = router;
