const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const {
  STUDENT_AUTO_ACTIVATION_KEY,
  EMAIL_SERVICE_ENABLED_KEY,
  EMAIL_VERIFICATION_REQUIRED_KEY,
  isStudentAutoActivationEnabled,
  isEmailServiceEnabled,
  isEmailVerificationRequired,
  setBooleanSetting
} = require('../utils/appSettings');
const { emailReady, sendTestEmail } = require('../utils/email');

router.get('/student-activation', authenticateToken, requireRole(ROLES.ADMINISTRATOR), async (req, res) => {
  try {
    const enabled = await isStudentAutoActivationEnabled();
    res.json({
      auto_activation_enabled: enabled,
      requires_manual_activation: !enabled
    });
  } catch (error) {
    console.error('Error reading student activation setting:', error);
    res.status(500).json({ error: 'فشل في قراءة إعداد تفعيل الطلاب' });
  }
});

router.put('/student-activation', authenticateToken, requireRole(ROLES.ADMINISTRATOR), async (req, res) => {
  try {
    const enabled = Boolean(req.body.auto_activation_enabled);
    const setting = await setBooleanSetting(STUDENT_AUTO_ACTIVATION_KEY, enabled, req.user.id);

    res.json({
      message: enabled
        ? 'تم تفعيل الطلاب الجدد تلقائيا'
        : 'تم إيقاف التفعيل التلقائي للطلاب الجدد',
      auto_activation_enabled: setting.value === true,
      requires_manual_activation: setting.value !== true
    });
  } catch (error) {
    console.error('Error updating student activation setting:', error);
    res.status(500).json({ error: 'فشل في تحديث إعداد تفعيل الطلاب' });
  }
});

// --- Email service settings (admin-only) ---------------------------------

// GET /api/settings/email — current email switches + whether Resend is configured.
router.get('/email', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const ready = await emailReady();
    res.json({
      email_service_enabled: await isEmailServiceEnabled(),
      email_verification_required: await isEmailVerificationRequired(),
      resend_configured: Boolean(process.env.RESEND_API_KEY),
      service_ready: ready.ready === true,
      from_address: process.env.EMAIL_FROM || null,
    });
  } catch (error) {
    console.error('Error reading email settings:', error);
    res.status(500).json({ error: 'فشل قراءة إعدادات البريد' });
  }
});

// PUT /api/settings/email — toggle the master switch / verification requirement.
router.put('/email', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    if (req.body.email_service_enabled !== undefined) {
      await setBooleanSetting(EMAIL_SERVICE_ENABLED_KEY, Boolean(req.body.email_service_enabled), req.user.id);
    }
    if (req.body.email_verification_required !== undefined) {
      await setBooleanSetting(EMAIL_VERIFICATION_REQUIRED_KEY, Boolean(req.body.email_verification_required), req.user.id);
    }
    const ready = await emailReady();
    res.json({
      message: 'تم تحديث إعدادات البريد الإلكتروني',
      email_service_enabled: await isEmailServiceEnabled(),
      email_verification_required: await isEmailVerificationRequired(),
      resend_configured: Boolean(process.env.RESEND_API_KEY),
      service_ready: ready.ready === true,
    });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: 'فشل تحديث إعدادات البريد' });
  }
});

// POST /api/settings/email/test — send a test email (admin verifies Resend works).
router.post('/email/test', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const to = req.body.to || req.user.email;
    if (!to) return res.status(400).json({ error: 'يرجى تحديد بريد المستلم' });
    const result = await sendTestEmail(to);
    if (!result.sent) {
      return res.status(503).json({ error: 'تعذر إرسال رسالة الاختبار', reason: result.reason });
    }
    res.json({ message: `تم إرسال رسالة اختبار إلى ${to}` });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'فشل إرسال رسالة الاختبار' });
  }
});

module.exports = router;
