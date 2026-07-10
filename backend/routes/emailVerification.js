const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { issueVerification, consumeVerification } = require('../utils/emailVerification');
const { emailReady } = require('../utils/email');
const { isEmailVerificationRequired } = require('../utils/appSettings');

const router = express.Router();

const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز عدد محاولات إرسال رسالة التأكيد. حاول لاحقاً.' },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة. حاول لاحقاً.' },
});

// GET /api/email/status — verification state for the logged-in user + config.
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT email, email_verified FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0] || {};
    const ready = await emailReady();
    res.json({
      email: user.email || null,
      email_verified: user.email_verified === true,
      has_email: Boolean(user.email),
      verification_required: await isEmailVerificationRequired(),
      service_ready: ready.ready === true,
    });
  } catch (error) {
    console.error('Email status error:', error);
    res.status(500).json({ error: 'فشل تحميل حالة البريد' });
  }
});

// POST /api/email/send-verification — (re)send a verification link to self.
router.post('/send-verification', authenticateToken, sendLimiter, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT id, email, first_name, email_verified FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (!user.email) return res.status(400).json({ error: 'لا يوجد بريد إلكتروني مسجل لحسابك' });
    if (user.email_verified) return res.json({ message: 'بريدك مؤكد بالفعل', already_verified: true });

    const result = await issueVerification(user);
    if (!result.sent) {
      const reasonMsg =
        result.reason === 'disabled_by_admin'
          ? 'خدمة البريد الإلكتروني غير مفعّلة حالياً من الإدارة'
          : result.reason === 'no_api_key'
            ? 'خدمة البريد الإلكتروني غير مهيأة على الخادم'
            : 'تعذر إرسال رسالة التأكيد حالياً';
      return res.status(503).json({ error: reasonMsg, reason: result.reason });
    }
    res.json({ message: 'تم إرسال رابط التأكيد إلى بريدك الإلكتروني' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'فشل إرسال رسالة التأكيد' });
  }
});

// POST /api/email/verify — consume a verification token (public, token-based).
router.post('/verify', verifyLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'رمز التأكيد مطلوب' });
    const result = await consumeVerification(String(token));
    if (!result.ok) return res.status(400).json({ error: 'رابط التأكيد غير صالح أو منتهي الصلاحية' });
    res.json({ message: 'تم تأكيد بريدك الإلكتروني بنجاح', verified: true });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'فشل تأكيد البريد الإلكتروني' });
  }
});

module.exports = router;
