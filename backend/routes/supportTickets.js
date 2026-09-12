const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');
const { encryptMessageBody, decryptMessageBody } = require('../utils/messageCrypto');

const createLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'تم رفع عدة مشكلات. حاول لاحقًا' } });
const replyLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'تم إرسال ردود كثيرة. حاول بعد دقيقة' } });

async function getTicket(ticketId, user) {
  const result = await db.query(`SELECT * FROM support_tickets WHERE id=$1 AND ($2='admin' OR created_by=$3)`, [ticketId, user.role, user.id]);
  return result.rows[0] || null;
}

router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const params = req.user.role === 'admin' ? [limit] : [req.user.id, limit];
    const scope = req.user.role === 'admin' ? '' : 'WHERE t.created_by=$1';
    const limitParam = req.user.role === 'admin' ? '$1' : '$2';
    const result = await db.query(`
      SELECT t.*, TRIM(CONCAT_WS(' ', u.first_name, u.second_name, u.last_name)) AS creator_name,
             (SELECT COUNT(*)::int FROM support_ticket_messages m WHERE m.ticket_id=t.id) AS messages_count
      FROM support_tickets t JOIN users u ON u.id=t.created_by ${scope}
      ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.updated_at DESC
      LIMIT ${limitParam}
    `, params);
    res.json({ tickets: result.rows });
  } catch (error) { console.error('List support tickets error:', error); res.status(500).json({ error: 'فشل تحميل المشكلات التقنية' }); }
});

router.post('/', auth, createLimiter, async (req, res) => {
  const client = await db.connect();
  try {
    const subject = String(req.body.subject || '').trim();
    const body = String(req.body.body || '').trim();
    if (!subject || subject.length > 200 || !body || body.length > 4000) return res.status(400).json({ error: 'العنوان والوصف مطلوبان ضمن الحد المسموح' });
    await client.query('BEGIN');
    const admin = await client.query(`SELECT id FROM users WHERE role='admin' AND is_active=true ORDER BY created_at LIMIT 1`);
    if (!admin.rows.length) { await client.query('ROLLBACK'); return res.status(503).json({ error: 'لا يوجد أدمن منصة متاح حاليًا' }); }
    const ticket = await client.query(`INSERT INTO support_tickets(created_by, assigned_admin_id, subject) VALUES($1,$2,$3) RETURNING *`, [req.user.id, admin.rows[0].id, subject]);
    await client.query(`INSERT INTO support_ticket_messages(ticket_id,sender_id,body) VALUES($1,$2,$3)`, [ticket.rows[0].id, req.user.id, encryptMessageBody(body)]);
    await client.query('COMMIT');
    res.status(201).json({ ticket: ticket.rows[0] });
  } catch (error) { await client.query('ROLLBACK'); console.error('Create support ticket error:', error); res.status(500).json({ error: 'فشل رفع المشكلة التقنية' }); }
  finally { client.release(); }
});

router.get('/:id/messages', auth, async (req, res) => {
  try {
    const ticket = await getTicket(req.params.id, req.user);
    if (!ticket) return res.status(404).json({ error: 'المشكلة غير موجودة أو غير مسموح بعرضها' });
    if (req.user.role === 'admin' && !ticket.admin_viewed_at) {
      await db.query(`UPDATE support_tickets SET admin_viewed_at=NOW() WHERE id=$1`, [ticket.id]);
    }
    const result = await db.query(`SELECT m.id,m.sender_id,m.body,m.created_at,TRIM(CONCAT_WS(' ',u.first_name,u.second_name,u.last_name)) AS sender_name,u.role AS sender_role FROM support_ticket_messages m JOIN users u ON u.id=m.sender_id WHERE m.ticket_id=$1 ORDER BY m.created_at,m.id LIMIT 200`, [req.params.id]);
    result.rows.forEach((row) => { row.body = decryptMessageBody(row.body); });
    res.json({ ticket, messages: result.rows });
  } catch (error) { console.error('Support ticket messages error:', error); res.status(500).json({ error: 'فشل تحميل تفاصيل المشكلة' }); }
});

router.post('/:id/messages', auth, replyLimiter, async (req, res) => {
  try {
    const ticket = await getTicket(req.params.id, req.user);
    if (!ticket) return res.status(404).json({ error: 'المشكلة غير موجودة أو غير مسموح بالرد عليها' });
    const body = String(req.body.body || '').trim();
    if (!body || body.length > 4000) return res.status(400).json({ error: 'نص الرد مطلوب وبحد أقصى 4000 حرف' });
    const result = await db.query(`INSERT INTO support_ticket_messages(ticket_id,sender_id,body) VALUES($1,$2,$3) RETURNING *`, [ticket.id, req.user.id, encryptMessageBody(body)]);
    await db.query(`UPDATE support_tickets SET updated_at=NOW(), status=CASE WHEN $2='admin' AND status='open' THEN 'in_progress' ELSE status END WHERE id=$1`, [ticket.id, req.user.role]);
    res.status(201).json({ message: { ...result.rows[0], body } });
  } catch (error) { console.error('Support reply error:', error); res.status(500).json({ error: 'فشل إرسال الرد' }); }
});

router.patch('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'تغيير الحالة متاح لأدمن المنصة فقط' });
  const status = String(req.body.status || '');
  if (!['open','in_progress','resolved','closed'].includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });
  const result = await db.query(`UPDATE support_tickets SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *`, [status, req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'المشكلة غير موجودة' });
  res.json({ ticket: result.rows[0] });
});

module.exports = router;
