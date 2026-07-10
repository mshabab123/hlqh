// Email delivery via Resend (https://resend.com), gated by an ADMIN master
// switch stored in app_settings ('email_service_enabled') AND by the presence
// of RESEND_API_KEY. If either is off/missing, sends become safe no-ops that
// return { sent: false, reason } instead of throwing — so registration and
// password-reset keep working even when email is disabled.

const crypto = require('crypto');
const { isEmailServiceEnabled } = require('./appSettings');

const RESEND_API_URL = 'https://api.resend.com/emails';
const APP_NAME = process.env.APP_NAME || 'منصة الحلقات';

const getFrom = () =>
  process.env.EMAIL_FROM || `${APP_NAME} <onboarding@resend.dev>`;

const getFrontendBase = () =>
  (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();

// True only when an admin enabled the service AND an API key is configured.
async function emailReady() {
  if (!process.env.RESEND_API_KEY) return { ready: false, reason: 'no_api_key' };
  if (!(await isEmailServiceEnabled())) return { ready: false, reason: 'disabled_by_admin' };
  return { ready: true };
}

// Low-level send. Returns { sent, id?, reason?, error? } and never throws.
async function sendEmail({ to, subject, html, text }) {
  const status = await emailReady();
  if (!status.ready) return { sent: false, reason: status.reason };
  if (!to) return { sent: false, reason: 'no_recipient' };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getFrom(),
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('Resend send failed:', response.status, body);
      return { sent: false, reason: 'resend_error', error: `${response.status}` };
    }

    const data = await response.json().catch(() => ({}));
    return { sent: true, id: data?.id };
  } catch (error) {
    console.error('Resend request error:', error.message);
    return { sent: false, reason: 'network_error', error: error.message };
  }
}

// A random, URL-safe token plus its SHA-256 hash for storage.
function generateEmailToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

const hashEmailToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// --- RTL Arabic templates -------------------------------------------------

function layout(title, bodyHtml) {
  return `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;background:#f1f5f9;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#0f6f79,#0a4f57);color:#fff;padding:20px 24px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="margin:0;font-size:20px;">${APP_NAME}</h1>
    </div>
    <div style="background:#fff;padding:28px 24px;border-radius:0 0 16px 16px;color:#1f2937;line-height:1.9;">
      <h2 style="margin-top:0;color:#0a4f57;font-size:18px;">${title}</h2>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">
      هذه رسالة آلية من ${APP_NAME}. إذا لم تطلبها، يمكنك تجاهلها.
    </p>
  </div></body></html>`;
}

function button(href, label) {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#0f6f79;color:#fff;text-decoration:none;
       padding:12px 28px;border-radius:10px;font-weight:bold;font-size:15px;">${label}</a>
  </div>
  <p style="font-size:12px;color:#64748b;word-break:break-all;">أو انسخ الرابط: ${href}</p>`;
}

async function sendVerificationEmail(user, token) {
  const link = `${getFrontendBase()}/verify-email?token=${token}`;
  const name = user.first_name || 'مستخدم';
  return sendEmail({
    to: user.email,
    subject: `تأكيد بريدك الإلكتروني - ${APP_NAME}`,
    html: layout(
      'تأكيد البريد الإلكتروني',
      `<p>مرحباً ${name}،</p>
       <p>شكراً لتسجيلك في ${APP_NAME}. لتأكيد بريدك الإلكتروني، اضغط الزر التالي:</p>
       ${button(link, 'تأكيد البريد الإلكتروني')}
       <p style="font-size:13px;color:#64748b;">هذا الرابط صالح لمدة 24 ساعة.</p>`
    ),
  });
}

async function sendPasswordResetEmail(user, token) {
  const link = `${getFrontendBase()}/reset-password?token=${token}`;
  const name = user.first_name || 'مستخدم';
  return sendEmail({
    to: user.email,
    subject: `إعادة تعيين كلمة المرور - ${APP_NAME}`,
    html: layout(
      'إعادة تعيين كلمة المرور',
      `<p>مرحباً ${name}،</p>
       <p>تلقينا طلباً لإعادة تعيين كلمة مرور حسابك. اضغط الزر التالي لتعيين كلمة مرور جديدة:</p>
       ${button(link, 'إعادة تعيين كلمة المرور')}
       <p style="font-size:13px;color:#64748b;">هذا الرابط صالح لمدة 30 دقيقة. إذا لم تطلب ذلك، تجاهل الرسالة وحسابك آمن.</p>`
    ),
  });
}

async function sendTestEmail(to) {
  return sendEmail({
    to,
    subject: `رسالة اختبار - ${APP_NAME}`,
    html: layout('رسالة اختبار', `<p>تم إعداد خدمة البريد الإلكتروني بنجاح ✅</p>`),
  });
}

module.exports = {
  emailReady,
  sendEmail,
  generateEmailToken,
  hashEmailToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTestEmail,
  APP_NAME,
};
