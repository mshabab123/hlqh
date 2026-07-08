const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { canAccessSchool, canAccessStudent } = require('../utils/accessScope');
const {
  getCertificatePassThreshold,
  setCertificatePassThreshold,
} = require('../utils/appSettings');

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

// Passing threshold is controlled by admins/managers and stored globally.
router.get('/settings/pass-threshold', authenticateToken, requireCertificateManager, async (req, res) => {
  try {
    const passThreshold = await getCertificatePassThreshold();
    res.json({ pass_threshold: passThreshold });
  } catch (error) {
    console.error('Error reading certificate pass threshold:', error);
    res.status(500).json({ error: 'فشل تحميل درجة النجاح' });
  }
});

router.put('/settings/pass-threshold', authenticateToken, requireCertificateManager, async (req, res) => {
  try {
    const setting = await setCertificatePassThreshold(req.body.pass_threshold, req.user.id);
    res.json({
      message: 'تم تحديث درجة النجاح',
      pass_threshold: Number(setting.value),
    });
  } catch (error) {
    console.error('Error updating certificate pass threshold:', error);
    res.status(500).json({ error: 'فشل تحديث درجة النجاح' });
  }
});

router.get('/semesters/:semesterId/students', authenticateToken, requireCertificateManager, async (req, res) => {
  try {
    const semester = await getSemester(req, res, req.params.semesterId);
    if (!semester) return;

    const passThreshold = await getCertificatePassThreshold();
    const rawStudents = await listSemesterStudents(req.params.semesterId);
    const students = rawStudents.map((student) => ({
      ...student,
      passed: Number(student.grade_count || 0) > 0 && Number(student.average_grade || 0) >= passThreshold,
    }));

    res.json({ semester, students, pass_threshold: passThreshold });
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

    // The passing threshold is set by the admin/manager. If a value is sent with
    // the grant request we persist it as the new default, otherwise use the stored one.
    let passThreshold;
    if (req.body.pass_threshold !== undefined && req.body.pass_threshold !== null && req.body.pass_threshold !== '') {
      const saved = await setCertificatePassThreshold(req.body.pass_threshold, req.user.id);
      passThreshold = Number(saved.value);
    } else {
      passThreshold = await getCertificatePassThreshold();
    }

    const students = await listSemesterStudents(req.params.semesterId);
    const eligibleStudents = students.filter((student) => {
      return (
        !excludedIds.has(String(student.student_id)) &&
        Number(student.grade_count || 0) > 0 &&
        Number(student.average_grade || 0) >= passThreshold
      );
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
      pass_threshold: passThreshold,
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

// Returns issued certificates (fully joined for display) for a set of student ids.
async function fetchIssuedCertificates(studentIds) {
  if (!studentIds || studentIds.length === 0) return [];

  const result = await db.query(
    `SELECT cert.id, cert.certificate_number, cert.status, cert.issued_at,
            cert.student_id, cert.semester_id, cert.average_grade, cert.grade_count, cert.payload,
            sem.display_name as semester_name, sem.year as semester_year,
            sch.name as school_name, c.name as class_name,
            st.school_level,
            CONCAT_WS(' ', u.first_name, u.second_name, u.third_name, u.last_name) as student_name
     FROM student_certificates cert
     JOIN semesters sem ON sem.id = cert.semester_id
     LEFT JOIN schools sch ON sch.id = cert.school_id
     LEFT JOIN classes c ON c.id = cert.class_id
     JOIN users u ON u.id = cert.student_id
     JOIN students st ON st.id = cert.student_id
     WHERE cert.status = 'issued'
       AND cert.student_id = ANY($1::varchar[])
     ORDER BY cert.issued_at DESC NULLS LAST`,
    [studentIds]
  );

  return result.rows.map((row) => {
    const payload = row.payload || {};
    return {
      id: row.id,
      certificate_number: row.certificate_number,
      status: row.status,
      issued_at: row.issued_at,
      student_id: row.student_id,
      semester_id: row.semester_id,
      student_name: row.student_name || payload.student_name,
      school_level: row.school_level || payload.school_level,
      school_name: row.school_name || payload.school_name,
      class_name: row.class_name || payload.class_name,
      teacher_name: payload.teacher_name,
      semester_name: row.semester_name || payload.semester_name,
      semester_year: row.semester_year || payload.semester_year,
      average_grade: Number(row.average_grade || payload.average_grade || 0),
      grade_count: Number(row.grade_count || payload.grade_count || 0),
    };
  });
}

// Certificates visible to the logged-in student and/or parent.
// - student / parent_student: their own issued certificates
// - parent / parent_student: their linked children's issued certificates
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = String(req.user.id);
    const studentIds = new Set();

    if (role === 'student' || role === 'parent_student') {
      studentIds.add(userId);
    }

    if (role === 'parent' || role === 'parent_student') {
      const children = await db.query(
        'SELECT student_id FROM parent_student_relationships WHERE parent_id = $1',
        [userId]
      );
      children.rows.forEach((row) => studentIds.add(String(row.student_id)));
    }

    const certificates = await fetchIssuedCertificates(Array.from(studentIds));
    res.json({ certificates });
  } catch (error) {
    console.error('Error fetching my certificates:', error);
    res.status(500).json({ error: 'فشل تحميل الشهادات' });
  }
});

// Certificates for a specific student, visible to staff who can access them
// (teacher of the student's class, school administrator/supervisor, or admin)
// as well as the student themselves and their parent.
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!(await canAccessStudent(db, req.user, studentId))) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لعرض شهادات هذا الطالب' });
    }

    const certificates = await fetchIssuedCertificates([String(studentId)]);
    res.json({ certificates });
  } catch (error) {
    console.error('Error fetching student certificates:', error);
    res.status(500).json({ error: 'فشل تحميل شهادات الطالب' });
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
