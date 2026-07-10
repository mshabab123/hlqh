// Periodic (daily/weekly) student progress reports emailed to parents/students.
// Runs only when the master switch + reports switch are on and Resend is ready.

const db = require('../config/database');
const {
  isEmailServiceEnabled,
  isEmailReportsEnabled,
  getEmailReportsFrequency,
  getEmailReportFields,
} = require('./appSettings');
const { emailReady, sendStudentReportEmail } = require('./email');
const { calculateQuranProgress, TOTAL_QURAN_PAGES, getSurahNameFromId } = require('./quranUtils.js');

const dayMs = 24 * 60 * 60 * 1000;

// Build the list of active students with a deliverable recipient (parent email
// preferred, else the student's own email) plus the fields we summarise.
async function fetchReportRecipients() {
  const result = await db.query(`
    SELECT DISTINCT ON (s.id)
      s.id AS student_id,
      CONCAT_WS(' ', su.first_name, su.second_name, su.last_name) AS student_name,
      s.memorized_surah_id, s.memorized_ayah_number,
      s.target_surah_id, s.target_ayah_number,
      COALESCE(pu.email, su.email) AS recipient_email,
      CASE WHEN pu.email IS NOT NULL THEN 'parent' ELSE 'student' END AS recipient_type,
      pu.first_name AS parent_first_name
    FROM students s
    JOIN users su ON su.id = s.id AND su.is_active = true
    LEFT JOIN parent_student_relationships psr ON psr.student_id = s.id AND psr.is_primary = true
    LEFT JOIN users pu ON pu.id = psr.parent_id
    WHERE COALESCE(pu.email, su.email) IS NOT NULL
    ORDER BY s.id, psr.is_primary DESC NULLS LAST
  `);
  return result.rows;
}

// Compact per-period summary for one student, honouring the admin's field
// selection. `fields` is the enabled-fields map from getEmailReportFields().
async function buildSummary(student, sinceDate, fields) {
  const studentId = student.student_id;
  const [grades, attendance, points] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS n,
              ROUND(AVG(CASE WHEN max_grade > 0 THEN grade_value::numeric / max_grade * 100 ELSE grade_value END)::numeric, 1) AS avg
       FROM grades
       WHERE student_id = $1 AND grade_value IS NOT NULL AND COALESCE(date_graded, created_at) >= $2`,
      [studentId, sinceDate]
    ),
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_present)::int AS present,
         COUNT(*) FILTER (WHERE NOT is_present)::int AS absent
       FROM semester_attendance
       WHERE student_id = $1 AND attendance_date >= $2`,
      [studentId, sinceDate]
    ),
    db.query(
      `SELECT COALESCE(SUM(points_given), 0)::int AS total
       FROM daily_points
       WHERE student_id = $1 AND points_date >= $2`,
      [studentId, sinceDate]
    ),
  ]);

  const g = grades.rows[0] || {};
  const a = attendance.rows[0] || {};
  const p = points.rows[0] || {};
  const totalDays = (a.present || 0) + (a.absent || 0);
  const rate = totalDays ? Math.round((a.present / totalDays) * 100) : null;

  const memorizedPages = calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).memorizedPages || 0;
  const juz = Math.floor(memorizedPages / (TOTAL_QURAN_PAGES / 30));
  const goalText = student.target_surah_id
    ? `سورة ${getSurahNameFromId(student.target_surah_id) || student.target_surah_id}${student.target_ayah_number ? ` - آية ${student.target_ayah_number}` : ''}`
    : '—';

  // Every possible field, keyed by catalog key.
  const all = {
    grades_count: { label: 'عدد الدرجات المسجلة', value: g.n || 0 },
    grades_average: { label: 'متوسط الدرجات', value: g.n ? `${g.avg}%` : '—' },
    attendance_present: { label: 'أيام الحضور', value: a.present || 0 },
    attendance_absent: { label: 'أيام الغياب', value: a.absent || 0 },
    attendance_rate: { label: 'نسبة الحضور', value: rate === null ? '—' : `${rate}%` },
    points: { label: 'النقاط المكتسبة', value: p.total || 0 },
    memorization: { label: 'المحفوظ (تقريباً)', value: juz > 0 ? `${juz} جزء` : '—' },
    goal: { label: 'هدف الفصل الحالي', value: goalText },
  };

  // Keep only the admin-enabled fields, in catalog order.
  const order = ['grades_count', 'grades_average', 'attendance_present', 'attendance_absent', 'attendance_rate', 'points', 'memorization', 'goal'];
  const rows = order.filter((k) => fields[k]).map((k) => all[k]);

  // Only send if there was any real activity in the period.
  const hasActivity = (g.n || 0) > 0 || totalDays > 0 || (p.total || 0) > 0;
  return { rows, hasActivity };
}

// Main job. Returns { skipped?, sent, failed, total }.
async function runStudentReports({ force = false } = {}) {
  if (!(await isEmailServiceEnabled())) return { skipped: 'service_disabled' };
  if (!force && !(await isEmailReportsEnabled())) return { skipped: 'reports_disabled' };
  const ready = await emailReady();
  if (!ready.ready) return { skipped: ready.reason };

  const frequency = await getEmailReportsFrequency();
  const periodDays = frequency === 'daily' ? 1 : 7;
  const periodLabel = frequency === 'daily' ? 'اليوم' : 'الأسبوع';
  const sinceDate = new Date(Date.now() - periodDays * dayMs).toISOString().split('T')[0];

  const fields = await getEmailReportFields();
  const recipients = await fetchReportRecipients();
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      const summary = await buildSummary(r, sinceDate, fields);
      if (!summary.hasActivity || summary.rows.length === 0) continue; // no noise
      const result = await sendStudentReportEmail(r.recipient_email, {
        studentName: r.student_name,
        periodLabel,
        rows: summary.rows,
        note: 'يمكنك متابعة التفاصيل الكاملة من خلال المنصة.',
      });
      if (result.sent) sent++;
      else failed++;
    } catch (error) {
      console.error('report send error for', r.student_id, error.message);
      failed++;
    }
  }

  return { sent, failed, total: recipients.length, frequency };
}

module.exports = { runStudentReports };
