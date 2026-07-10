// إصلاح لمرة واحدة (آمن وقابل للتكرار): تسجيل كل طالب لديه درجات في فصل دراسي
// لكنه غير مرئي لنظام الشهادات (لا تسجيل غير ملغى، ولا التحاق نشط، ولا شهادة
// صادرة) — يُسجَّل في ذلك الفصل مرتبطاً بالحلقة التي رُصدت فيها درجاته.
//
// التشغيل على السيرفر من مجلد backend:
//   node scripts/repairCertificateRegistrations.js           ← معاينة فقط (بدون حفظ)
//   node scripts/repairCertificateRegistrations.js --commit  ← تنفيذ فعلي
//
// بعده يُمنح هؤلاء من شاشة الشهادات (سيظهرون بالأحمر كمُزالين، مستثنين افتراضياً).

const path = require('path');
process.chdir(path.join(__dirname, '..')); // حتى يُقرأ backend/.env
const db = require('../config/database');

const COMMIT = process.argv.includes('--commit');

(async () => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const adminRes = await client.query(
      "SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1"
    );
    const adminId = adminRes.rows[0]?.id || null;

    const cases = await client.query(`
      SELECT g.semester_id, g.student_id,
        CONCAT_WS(' ', u.first_name, u.second_name, u.last_name) AS name,
        COUNT(*)::int AS grades_count,
        ROUND(AVG(CASE WHEN g.max_grade > 0 THEN g.grade_value::numeric / g.max_grade * 100
                       ELSE g.grade_value END), 1) AS avg,
        (SELECT g2.class_id FROM grades g2
          WHERE g2.student_id = g.student_id AND g2.semester_id = g.semester_id
            AND g2.class_id IS NOT NULL
          GROUP BY g2.class_id ORDER BY COUNT(*) DESC LIMIT 1) AS grades_class,
        (SELECT se.class_id FROM student_enrollments se
          JOIN classes cc ON cc.id = se.class_id
          WHERE se.student_id = g.student_id AND cc.semester_id = g.semester_id
          ORDER BY se.enrollment_date DESC NULLS LAST LIMIT 1) AS enrollment_class
      FROM grades g
      JOIN users u ON u.id = g.student_id
      WHERE g.grade_value IS NOT NULL
      GROUP BY g.semester_id, g.student_id, u.first_name, u.second_name, u.last_name
      HAVING NOT EXISTS (SELECT 1 FROM student_certificates ct
                          WHERE ct.semester_id = g.semester_id
                            AND ct.student_id = g.student_id AND ct.status = 'issued')
         AND NOT EXISTS (SELECT 1 FROM semester_registrations sr
                          WHERE sr.semester_id = g.semester_id
                            AND sr.student_id = g.student_id AND sr.status <> 'cancelled')
         AND NOT EXISTS (SELECT 1 FROM student_enrollments se
                          JOIN classes cc ON cc.id = se.class_id
                          WHERE cc.semester_id = g.semester_id
                            AND se.student_id = g.student_id AND se.status = 'enrolled')
      ORDER BY g.semester_id, name
    `);

    console.log(`الحالات المكتشفة: ${cases.rows.length}`);

    let fixed = 0;
    let skipped = 0;
    for (const row of cases.rows) {
      const classId = row.grades_class || row.enrollment_class || null;
      if (!classId) {
        console.log(`  ⚠ تخطي (لا حلقة معروفة): سمستر ${row.semester_id} | ${row.name} (${row.student_id})`);
        skipped++;
        continue;
      }
      console.log(`  ✓ سمستر ${row.semester_id} | ${row.name} (${row.student_id}) | درجات: ${row.grades_count} | متوسط: ${row.avg}%`);
      await client.query(
        `INSERT INTO semester_registrations
           (semester_id, student_id, registered_by, class_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'assigned', NOW(), NOW())
         ON CONFLICT (semester_id, student_id)
         DO UPDATE SET class_id = EXCLUDED.class_id, status = 'assigned', updated_at = NOW()`,
        [row.semester_id, row.student_id, adminId, classId]
      );
      fixed++;
    }

    if (COMMIT) {
      await client.query('COMMIT');
      console.log(`\nتم الحفظ ✅ — سُجّل ${fixed} حالة، تُخطي ${skipped}.`);
      console.log('الخطوة التالية: من شاشة الشهادات، افتح كل فصل وامنح من تراه مستحقاً (سيظهرون بالأحمر).');
    } else {
      await client.query('ROLLBACK');
      console.log(`\nمعاينة فقط (لم يُحفظ شيء). كان سيُسجَّل ${fixed} حالة.`);
      console.log('للتنفيذ الفعلي: node scripts/repairCertificateRegistrations.js --commit');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('فشل الإصلاح:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit();
  }
})();
