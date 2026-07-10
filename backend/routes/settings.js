const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const {
  STUDENT_AUTO_ACTIVATION_KEY,
  EMAIL_SERVICE_ENABLED_KEY,
  EMAIL_VERIFICATION_ENABLED_KEY,
  EMAIL_VERIFICATION_REQUIRED_KEY,
  EMAIL_PASSWORD_RESET_ENABLED_KEY,
  EMAIL_REPORTS_ENABLED_KEY,
  EMAIL_REPORTS_FREQUENCY_KEY,
  isStudentAutoActivationEnabled,
  isEmailServiceEnabled,
  isEmailVerificationEnabled,
  isEmailVerificationRequired,
  isEmailPasswordResetEnabled,
  isEmailReportsEnabled,
  getEmailReportsFrequency,
  getEmailReportFields,
  setEmailReportFields,
  REPORT_FIELD_CATALOG,
  setBooleanSetting,
  setStringSetting
} = require('../utils/appSettings');
const { emailReady, sendTestEmail } = require('../utils/email');
const { runStudentReports } = require('../utils/studentReports');

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

async function emailSettingsPayload() {
  const ready = await emailReady();
  return {
    email_service_enabled: await isEmailServiceEnabled(),
    email_verification_enabled: await isEmailVerificationEnabled(),
    email_verification_required: await isEmailVerificationRequired(),
    email_password_reset_enabled: await isEmailPasswordResetEnabled(),
    email_reports_enabled: await isEmailReportsEnabled(),
    email_reports_frequency: await getEmailReportsFrequency(),
    email_report_fields: await getEmailReportFields(),
    report_field_catalog: REPORT_FIELD_CATALOG,
    resend_configured: Boolean(process.env.RESEND_API_KEY),
    service_ready: ready.ready === true,
    from_address: process.env.EMAIL_FROM || null,
  };
}

// GET /api/settings/email — current per-purpose email switches + config status.
router.get('/email', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    res.json(await emailSettingsPayload());
  } catch (error) {
    console.error('Error reading email settings:', error);
    res.status(500).json({ error: 'فشل قراءة إعدادات البريد' });
  }
});

// PUT /api/settings/email — toggle any subset of the independent switches.
router.put('/email', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const b = req.body;
    const boolKeys = {
      email_service_enabled: EMAIL_SERVICE_ENABLED_KEY,
      email_verification_enabled: EMAIL_VERIFICATION_ENABLED_KEY,
      email_verification_required: EMAIL_VERIFICATION_REQUIRED_KEY,
      email_password_reset_enabled: EMAIL_PASSWORD_RESET_ENABLED_KEY,
      email_reports_enabled: EMAIL_REPORTS_ENABLED_KEY,
    };
    for (const [field, key] of Object.entries(boolKeys)) {
      if (b[field] !== undefined) await setBooleanSetting(key, Boolean(b[field]), req.user.id);
    }
    if (b.email_reports_frequency !== undefined) {
      const freq = b.email_reports_frequency === 'daily' ? 'daily' : 'weekly';
      await setStringSetting(EMAIL_REPORTS_FREQUENCY_KEY, freq, req.user.id);
    }
    if (b.email_report_fields !== undefined && typeof b.email_report_fields === 'object') {
      await setEmailReportFields(b.email_report_fields, req.user.id);
    }
    res.json({ message: 'تم تحديث إعدادات البريد الإلكتروني', ...(await emailSettingsPayload()) });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: 'فشل تحديث إعدادات البريد' });
  }
});

// POST /api/settings/email/send-reports-now — run the report job immediately.
router.post('/email/send-reports-now', authenticateToken, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const result = await runStudentReports({ force: true });
    if (result.skipped) {
      return res.status(503).json({ error: 'تعذر إرسال التقارير حالياً', reason: result.skipped });
    }
    res.json({ message: `تم إرسال ${result.sent} تقرير (${result.frequency})`, ...result });
  } catch (error) {
    console.error('Error sending reports now:', error);
    res.status(500).json({ error: 'فشل إرسال التقارير' });
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
