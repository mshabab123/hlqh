const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');
const { getAccessibleSchoolIds } = require('../utils/accessScope');

const fullNameSql = `TRIM(CONCAT_WS(' ', u.first_name, u.second_name, u.last_name))`;

async function getAllowedContactIds(user) {
  if (user.role === 'admin') {
    const result = await db.query(`SELECT id FROM users WHERE is_active = true AND id <> $1`, [user.id]);
    return result.rows.map((row) => String(row.id));
  }

  const schoolIds = await getAccessibleSchoolIds(db, user);
  if (schoolIds?.length) {
    const result = await db.query(`
      SELECT DISTINCT scoped.id FROM (
        SELECT id FROM users WHERE role = 'admin' AND is_active = true
        UNION
        SELECT u.id
        FROM users u
        LEFT JOIN teachers t ON t.id = u.id
        LEFT JOIN administrators a ON a.id = u.id
        LEFT JOIN supervisors s ON s.id = u.id
        LEFT JOIN teacher_class_assignments tca ON tca.teacher_id = u.id AND tca.is_active = true
        LEFT JOIN classes c ON c.id = tca.class_id
        WHERE COALESCE(t.school_id, a.school_id, s.school_id, c.school_id) = ANY($2::uuid[])
        UNION
        SELECT se.student_id
        FROM student_enrollments se JOIN classes c ON c.id = se.class_id
        WHERE se.status = 'enrolled' AND c.school_id = ANY($2::uuid[])
        UNION
        SELECT psr.parent_id
        FROM parent_student_relationships psr
        JOIN student_enrollments se ON se.student_id = psr.student_id AND se.status = 'enrolled'
        JOIN classes c ON c.id = se.class_id
        WHERE c.school_id = ANY($2::uuid[])
      ) scoped
      JOIN users active_user ON active_user.id = scoped.id
      WHERE active_user.is_active = true AND scoped.id <> $1
    `, [user.id, schoolIds]);
    return result.rows.map((row) => String(row.id));
  }

  // Parents and students may contact the staff attached to their own classes,
  // and linked parents/children may contact each other.
  const result = await db.query(`
    SELECT DISTINCT contact_id FROM (
      SELECT id AS contact_id FROM users WHERE role = 'admin' AND is_active = true
      UNION
      SELECT tca.teacher_id AS contact_id
      FROM student_enrollments se
      JOIN teacher_class_assignments tca ON tca.class_id = se.class_id AND tca.is_active = true
      WHERE se.student_id = $1 AND se.status = 'enrolled'
      UNION
      SELECT psr.parent_id FROM parent_student_relationships psr WHERE psr.student_id = $1
      UNION
      SELECT psr.student_id FROM parent_student_relationships psr WHERE psr.parent_id = $1
      UNION
      SELECT tca.teacher_id
      FROM parent_student_relationships psr
      JOIN student_enrollments se ON se.student_id = psr.student_id AND se.status = 'enrolled'
      JOIN teacher_class_assignments tca ON tca.class_id = se.class_id AND tca.is_active = true
      WHERE psr.parent_id = $1
      UNION
      SELECT se.student_id
      FROM teacher_class_assignments mine
      JOIN student_enrollments se ON se.class_id = mine.class_id AND se.status = 'enrolled'
      WHERE mine.teacher_id = $1 AND mine.is_active = true
      UNION
      SELECT psr.parent_id
      FROM teacher_class_assignments mine
      JOIN student_enrollments se ON se.class_id = mine.class_id AND se.status = 'enrolled'
      JOIN parent_student_relationships psr ON psr.student_id = se.student_id
      WHERE mine.teacher_id = $1 AND mine.is_active = true
      UNION
      SELECT staff.id
      FROM teacher_class_assignments mine
      JOIN classes c ON c.id = mine.class_id
      JOIN users staff ON staff.is_active = true
      LEFT JOIN administrators a ON a.id = staff.id
      LEFT JOIN supervisors s ON s.id = staff.id
      LEFT JOIN teachers t ON t.id = staff.id
      WHERE mine.teacher_id = $1 AND mine.is_active = true
        AND COALESCE(a.school_id, s.school_id, t.school_id) = c.school_id
    ) contacts WHERE contact_id IS NOT NULL AND contact_id <> $1
  `, [user.id]);
  return result.rows.map((row) => String(row.contact_id));
}

router.get('/contacts', auth, async (req, res) => {
  try {
    const ids = await getAllowedContactIds(req.user);
    if (!ids.length) return res.json({ contacts: [] });
    const result = await db.query(`
      SELECT u.id, ${fullNameSql} AS name, u.role
      FROM users u WHERE u.id = ANY($1::varchar[]) AND u.is_active = true
      ORDER BY u.first_name, u.last_name
    `, [ids]);
    res.json({ contacts: result.rows });
  } catch (error) {
    console.error('Get message contacts error:', error);
    res.status(500).json({ error: 'فشل تحميل جهات الاتصال' });
  }
});

router.get('/conversations', auth, async (req, res) => {
  try {
    const result = await db.query(`
      WITH mine AS (
        SELECT m.*, CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END AS contact_id
        FROM internal_messages m WHERE m.sender_id = $1 OR m.recipient_id = $1
      ), latest AS (
        SELECT DISTINCT ON (contact_id) contact_id, body, created_at
        FROM mine ORDER BY contact_id, created_at DESC, id DESC
      ), unread AS (
        SELECT sender_id AS contact_id, COUNT(*)::int AS unread_count
        FROM internal_messages WHERE recipient_id = $1 AND read_at IS NULL GROUP BY sender_id
      )
      SELECT u.id, ${fullNameSql} AS name, u.role, latest.body AS last_message,
             latest.created_at, COALESCE(unread.unread_count, 0) AS unread_count
      FROM latest JOIN users u ON u.id = latest.contact_id
      LEFT JOIN unread ON unread.contact_id = latest.contact_id
      ORDER BY latest.created_at DESC
    `, [req.user.id]);
    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'فشل تحميل المحادثات' });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  const result = await db.query(`SELECT COUNT(*)::int AS count FROM internal_messages WHERE recipient_id = $1 AND read_at IS NULL`, [req.user.id]);
  res.json({ count: result.rows[0].count });
});

router.get('/thread/:contactId', auth, async (req, res) => {
  try {
    const { contactId } = req.params;
    const allowed = await getAllowedContactIds(req.user);
    const hasExisting = await db.query(`SELECT 1 FROM internal_messages WHERE (sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1) LIMIT 1`, [req.user.id, contactId]);
    if (!allowed.includes(String(contactId)) && !hasExisting.rows.length) return res.status(403).json({ error: 'غير مسموح بهذه المحادثة' });
    await db.query(`UPDATE internal_messages SET read_at = NOW() WHERE sender_id=$2 AND recipient_id=$1 AND read_at IS NULL`, [req.user.id, contactId]);
    const result = await db.query(`
      SELECT id, sender_id, recipient_id, body, read_at, created_at
      FROM internal_messages WHERE (sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1)
      ORDER BY created_at, id
    `, [req.user.id, contactId]);
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get message thread error:', error);
    res.status(500).json({ error: 'فشل تحميل الرسائل' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const recipientId = String(req.body.recipient_id || '');
    const body = String(req.body.body || '').trim();
    if (!body || body.length > 4000) return res.status(400).json({ error: 'نص الرسالة مطلوب وبحد أقصى 4000 حرف' });
    const allowed = await getAllowedContactIds(req.user);
    if (!allowed.includes(recipientId)) return res.status(403).json({ error: 'لا يمكنك مراسلة هذا المستخدم' });
    const result = await db.query(`INSERT INTO internal_messages(sender_id, recipient_id, body) VALUES($1,$2,$3) RETURNING *`, [req.user.id, recipientId, body]);
    res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error('Send internal message error:', error);
    res.status(500).json({ error: 'فشل إرسال الرسالة' });
  }
});

module.exports = router;
