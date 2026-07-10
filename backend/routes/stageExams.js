const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { canAccessStudent } = require('../utils/accessScope');
const { requireFeature } = require('../utils/featurePrivileges');
const { QURAN_SURAHS, TOTAL_QURAN_PAGES } = require('../utils/quranUtils.js');

const router = express.Router();

// نظام المرحليات: كل جزءين محفوظين = مرحلية.
// المرحلية k تغطي الجزأين (32-2k) و(31-2k): المرحلية 1 = 30+29 ... المرحلية 15 = 2+1.
const MAX_STAGE = 15;

const stageJuzLabel = (stageNumber) => {
  const highJuz = 32 - 2 * stageNumber;
  const lowJuz = 31 - 2 * stageNumber;
  return `جزء ${highJuz} + ${lowJuz}`;
};

// حدود صفحات كل جزء في المصحف (الجزء 1: ص1-21، الجزء 30: ص582-604، والبقية 20 صفحة).
const juzPageRange = (juz) => {
  if (juz === 1) return [1, 21];
  if (juz === 30) return [582, TOTAL_QURAN_PAGES];
  const start = 2 + (juz - 1) * 20;
  return [start, start + 19];
};

const SURAHS_BY_NAME = new Map(QURAN_SURAHS.map((s) => [s.name, s]));

// صفحة المصحف لمرجع درجة: "سورة:آية" (بالرقم أو بالاسم) أو رقم صفحة مباشر.
const mushafPageOfReference = (reference) => {
  if (reference === null || reference === undefined || reference === '') return null;
  const ref = String(reference).trim();

  if (!ref.includes(':')) {
    const page = parseInt(ref, 10);
    return Number.isInteger(page) && page >= 1 && page <= TOTAL_QURAN_PAGES ? page : null;
  }

  const [surahPart, ayahPart] = ref.split(':');
  const surahId = parseInt(surahPart, 10);
  const surah = Number.isInteger(surahId)
    ? QURAN_SURAHS.find((s) => s.id === surahId)
    : SURAHS_BY_NAME.get(surahPart.trim());
  if (!surah) return null;

  const ayah = Math.max(1, parseInt(ayahPart, 10) || 1);
  const span = Math.max(1, (surah.endPage || surah.startPage) - surah.startPage);
  const offset = Math.min(span, Math.floor(((ayah - 1) / Math.max(1, surah.ayahCount)) * (span + 1)));
  return surah.startPage + offset;
};

// عدد الأجزاء المكتملة توثيقاً، متتابعة من الجزء 30 نزولاً — تُحتسب الصفحة
// محفوظة من مصدرين فقط: حقل خطة الحفظ، ودرجات الحفظ الفعلية (لا الهدف).
const juzCompletedOf = (memorizedSurahId, memorizedAyahNumber, gradeRefs = []) => {
  const covered = new Set();
  const addRange = (p1, p2) => {
    const from = Math.min(p1, p2);
    const to = Math.max(p1, p2);
    for (let p = from; p <= to; p++) covered.add(p);
  };

  // حقل المحفوظ: من صفحته حتى نهاية المصحف (الحفظ من الأخير).
  if (memorizedSurahId) {
    const memPage = mushafPageOfReference(`${memorizedSurahId}:${memorizedAyahNumber || 1}`);
    if (memPage) addRange(memPage, TOTAL_QURAN_PAGES);
  }

  for (const row of gradeRefs) {
    const a = mushafPageOfReference(row.start_reference);
    const b = mushafPageOfReference(row.end_reference);
    if (a && b) addRange(a, b);
    else if (a) covered.add(a);
    else if (b) covered.add(b);
  }

  // تحويل الآية إلى صفحة تقريبي، فنسمح بفجوة صغيرة (صفحتين) داخل الجزء
  // حتى لا تكسر حدودُ التقريب جزءاً محفوظاً فعلاً.
  const ALLOWED_GAP = 2;
  let count = 0;
  for (let juz = 30; juz >= 1; juz--) {
    const [start, end] = juzPageRange(juz);
    let missing = 0;
    for (let p = start; p <= end; p++) {
      if (!covered.has(p)) missing++;
    }
    if (missing > ALLOWED_GAP) break;
    count++;
  }
  return count;
};

// مراجع درجات الحفظ الموثِّقة لمجموعة طلاب — نفس دروس خريطة القرآن:
// الحفظ الجديد، التقييم الفصلي، المراجعة الصغرى، المراجعة الكبرى.
const fetchGradeRefs = async (studentIds) => {
  if (!studentIds.length) return {};
  const result = await db.query(
    `SELECT g.student_id, g.start_reference, g.end_reference
     FROM grades g
     LEFT JOIN semester_courses sc ON sc.id = g.course_id
     WHERE g.student_id = ANY($1::varchar[])
       AND g.grade_value IS NOT NULL
       AND g.grade_type = 'memorization'
       AND (g.start_reference IS NOT NULL OR g.end_reference IS NOT NULL)
       AND (
         sc.name LIKE '%الحفظ الجديد%' OR
         sc.name LIKE '%التقييم الفصلي%' OR
         sc.name LIKE '%المراجعة الصغرى%' OR
         sc.name LIKE '%المراجعة الكبرى%'
       )`,
    [studentIds]
  );
  return result.rows.reduce((acc, row) => {
    (acc[row.student_id] = acc[row.student_id] || []).push(row);
    return acc;
  }, {});
};

const STAFF_ROLES = ['admin', 'administrator', 'supervisor', 'teacher'];

// المراحل المؤهل لها الطالب ولم يدخلها/ينجح فيها بعد.
const computeReadiness = (juzCompleted, existingStages) => {
  const eligibleStages = Math.min(Math.floor(juzCompleted / 2), MAX_STAGE);
  const taken = new Map(existingStages.map((s) => [Number(s.stage_number), s.status]));
  const readyStages = [];
  for (let k = 1; k <= eligibleStages; k++) {
    const status = taken.get(k);
    if (!status || status === 'retry') readyStages.push(k);
  }
  return { juzCompleted, eligibleStages, readyStages };
};

// GET /api/stage-exams/config — تعريف المراحل للواجهة
router.get('/config', authenticateToken, (req, res) => {
  const stages = Array.from({ length: MAX_STAGE }, (_, i) => ({
    stage_number: i + 1,
    label: `المرحلية ${i + 1}`,
    juz_label: stageJuzLabel(i + 1),
  }));
  res.json({ stages });
});

// GET /api/stage-exams/ready — طلاب المعلم الجاهزون لدخول مرحلية (حسب خطة الحفظ)
router.get('/ready', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;
    if (!STAFF_ROLES.includes(role)) {
      return res.status(403).json({ error: 'هذه الصفحة متاحة للمعلمين والإدارة' });
    }

    // طلاب الفصل الدراسي الحالي: للمعلم طلاب حلقاته فقط، وللإدارة الجميع.
    const params = [];
    let teacherFilter = '';
    if (role === 'teacher') {
      params.push(req.user.id);
      teacherFilter = `AND c.id IN (
        SELECT class_id FROM teacher_class_assignments
        WHERE teacher_id = $1 AND is_active = TRUE
      )`;
    }

    const result = await db.query(
      `SELECT DISTINCT
         s.id as student_id,
         CONCAT_WS(' ', u.first_name, u.second_name, u.last_name) as student_name,
         s.memorized_surah_id, s.memorized_ayah_number,
         c.name as class_name
       FROM student_enrollments se
       JOIN classes c ON c.id = se.class_id
       JOIN semesters sem ON sem.id = c.semester_id
         AND sem.start_date <= CURRENT_DATE AND sem.end_date >= CURRENT_DATE
       JOIN students s ON s.id = se.student_id
       JOIN users u ON u.id = s.id
       WHERE se.status = 'enrolled' ${teacherFilter}`,
      params
    );

    const studentIds = result.rows.map((r) => r.student_id);
    const stagesRes = studentIds.length
      ? await db.query(
          'SELECT student_id, stage_number, status FROM stage_exams WHERE student_id = ANY($1::varchar[])',
          [studentIds]
        )
      : { rows: [] };
    const stagesByStudent = stagesRes.rows.reduce((acc, row) => {
      (acc[row.student_id] = acc[row.student_id] || []).push(row);
      return acc;
    }, {});
    const gradeRefsByStudent = await fetchGradeRefs(studentIds);

    const ready = result.rows
      .map((student) => {
        const juzCompleted = juzCompletedOf(
          student.memorized_surah_id,
          student.memorized_ayah_number,
          gradeRefsByStudent[student.student_id] || []
        );
        const readiness = computeReadiness(juzCompleted, stagesByStudent[student.student_id] || []);
        return {
          student_id: student.student_id,
          student_name: student.student_name,
          class_name: student.class_name,
          juz_completed: readiness.juzCompleted,
          ready_stages: readiness.readyStages,
          next_stage: readiness.readyStages[0] || null,
          next_stage_label: readiness.readyStages[0]
            ? `المرحلية ${readiness.readyStages[0]} (${stageJuzLabel(readiness.readyStages[0])})`
            : null,
        };
      })
      .filter((student) => student.ready_stages.length > 0)
      .sort((a, b) => b.juz_completed - a.juz_completed);

    res.json({ ready, count: ready.length });
  } catch (error) {
    console.error('Error fetching stage-ready students:', error);
    res.status(500).json({ error: 'فشل تحميل الطلاب الجاهزين للمرحليات' });
  }
});

// POST /api/stage-exams — المعلم يضيف طالباً لقائمة المرحليات
router.post('/', authenticateToken, requireFeature('manage_stage_exams'), async (req, res) => {
  try {
    const { student_id, stage_number } = req.body;
    const stage = Number(stage_number);

    if (!student_id || !Number.isInteger(stage) || stage < 1 || stage > MAX_STAGE) {
      return res.status(400).json({ error: 'بيانات المرحلية غير صحيحة' });
    }
    if (!(await canAccessStudent(db, req.user, student_id))) {
      return res.status(403).json({ error: 'ليس لديك صلاحية على هذا الطالب' });
    }

    // إعادة إدخال مرحلية "تحتاج إعادة" تزيد عدد المحاولات وتعيدها للقائمة.
    const result = await db.query(
      `INSERT INTO stage_exams (student_id, stage_number, status, added_by, attempts, created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, 1, NOW(), NOW())
       ON CONFLICT (student_id, stage_number)
       DO UPDATE SET
         status = CASE WHEN stage_exams.status = 'retry' THEN 'pending' ELSE stage_exams.status END,
         attempts = CASE WHEN stage_exams.status = 'retry' THEN stage_exams.attempts + 1 ELSE stage_exams.attempts END,
         added_by = EXCLUDED.added_by,
         updated_at = NOW()
       RETURNING *`,
      [student_id, stage, req.user.id]
    );

    const row = result.rows[0];
    if (row.status === 'passed') {
      return res.status(400).json({ error: 'الطالب اجتاز هذه المرحلية مسبقاً' });
    }

    res.status(201).json({ message: 'تمت إضافة الطالب لقائمة المرحليات', stage_exam: row });
  } catch (error) {
    console.error('Error adding stage exam:', error);
    res.status(500).json({ error: 'فشل إضافة الطالب للمرحلية' });
  }
});

// GET /api/stage-exams — قائمة المرحليات (للمعلم: طلاب حلقاته فقط)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;
    if (!STAFF_ROLES.includes(role)) {
      return res.status(403).json({ error: 'هذه الصفحة متاحة للمعلمين والإدارة' });
    }

    const params = [];
    let teacherFilter = '';
    if (role === 'teacher') {
      params.push(req.user.id);
      teacherFilter = `AND se.student_id IN (
        SELECT en.student_id FROM student_enrollments en
        JOIN teacher_class_assignments tca ON tca.class_id = en.class_id AND tca.is_active = TRUE
        WHERE tca.teacher_id = $1 AND en.status = 'enrolled'
      )`;
    }

    const result = await db.query(
      `SELECT se.*,
         CONCAT_WS(' ', u.first_name, u.second_name, u.last_name) as student_name,
         CONCAT_WS(' ', au.first_name, au.last_name) as added_by_name,
         CONCAT_WS(' ', eu.first_name, eu.last_name) as evaluated_by_name,
         (SELECT c.name FROM student_enrollments en2
           JOIN classes c ON c.id = en2.class_id
           JOIN semesters sm ON sm.id = c.semester_id
             AND sm.start_date <= CURRENT_DATE AND sm.end_date >= CURRENT_DATE
          WHERE en2.student_id = se.student_id AND en2.status = 'enrolled'
          LIMIT 1) as class_name
       FROM stage_exams se
       JOIN users u ON u.id = se.student_id
       LEFT JOIN users au ON au.id = se.added_by
       LEFT JOIN users eu ON eu.id = se.evaluated_by
       WHERE 1=1 ${teacherFilter}
       ORDER BY (se.status = 'pending') DESC, se.updated_at DESC`,
      params
    );

    res.json({
      stage_exams: result.rows.map((row) => ({
        ...row,
        stage_label: `المرحلية ${row.stage_number}`,
        juz_label: stageJuzLabel(row.stage_number),
      })),
    });
  } catch (error) {
    console.error('Error listing stage exams:', error);
    res.status(500).json({ error: 'فشل تحميل قائمة المرحليات' });
  }
});

// PATCH /api/stage-exams/:id — تقييم المرحلية: نجح أو تحتاج إعادة
router.patch('/:id', authenticateToken, requireFeature('manage_stage_exams'), async (req, res) => {
  try {
    const { status, score, notes } = req.body;
    if (!['passed', 'retry'].includes(status)) {
      return res.status(400).json({ error: 'الحالة يجب أن تكون: نجح أو تحتاج إعادة' });
    }

    const existing = await db.query('SELECT * FROM stage_exams WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'المرحلية غير موجودة' });
    }
    if (!(await canAccessStudent(db, req.user, existing.rows[0].student_id))) {
      return res.status(403).json({ error: 'ليس لديك صلاحية على هذا الطالب' });
    }

    const result = await db.query(
      `UPDATE stage_exams
       SET status = $2, score = $3, notes = COALESCE($4, notes),
           evaluated_by = $5, evaluated_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, status, score ?? null, notes ?? null, req.user.id]
    );

    res.json({
      message: status === 'passed' ? 'تم تسجيل اجتياز المرحلية 🎉' : 'سُجلت المرحلية كتحتاج إعادة',
      stage_exam: result.rows[0],
    });
  } catch (error) {
    console.error('Error evaluating stage exam:', error);
    res.status(500).json({ error: 'فشل تقييم المرحلية' });
  }
});

// GET /api/stage-exams/student/:studentId — مرحليات طالب (للمعلم/الإدارة/ولي الأمر/الطالب)
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!(await canAccessStudent(db, req.user, studentId))) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لعرض مرحليات هذا الطالب' });
    }

    const [stagesRes, studentRes] = await Promise.all([
      db.query(
        `SELECT se.*, CONCAT_WS(' ', eu.first_name, eu.last_name) as evaluated_by_name
         FROM stage_exams se
         LEFT JOIN users eu ON eu.id = se.evaluated_by
         WHERE se.student_id = $1
         ORDER BY se.stage_number`,
        [studentId]
      ),
      db.query('SELECT memorized_surah_id, memorized_ayah_number FROM students WHERE id = $1', [studentId]),
    ]);

    const student = studentRes.rows[0] || {};
    const gradeRefsByStudent = await fetchGradeRefs([studentId]);
    const juzCompleted = juzCompletedOf(
      student.memorized_surah_id,
      student.memorized_ayah_number,
      gradeRefsByStudent[studentId] || []
    );
    const readiness = computeReadiness(juzCompleted, stagesRes.rows);

    res.json({
      stage_exams: stagesRes.rows.map((row) => ({
        ...row,
        stage_label: `المرحلية ${row.stage_number}`,
        juz_label: stageJuzLabel(row.stage_number),
      })),
      juz_completed: readiness.juzCompleted,
      ready_stages: readiness.readyStages,
      next_stage: readiness.readyStages[0] || null,
      next_stage_label: readiness.readyStages[0]
        ? `المرحلية ${readiness.readyStages[0]} (${stageJuzLabel(readiness.readyStages[0])})`
        : null,
    });
  } catch (error) {
    console.error('Error fetching student stage exams:', error);
    res.status(500).json({ error: 'فشل تحميل مرحليات الطالب' });
  }
});

module.exports = router;
