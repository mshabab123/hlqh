const db = require('../config/database');

const STUDENT_AUTO_ACTIVATION_KEY = 'student_auto_activation_enabled';
const CERTIFICATE_PASS_THRESHOLD_KEY = 'certificate_pass_threshold';
const DEFAULT_CERTIFICATE_PASS_THRESHOLD = 50;
const EMAIL_SERVICE_ENABLED_KEY = 'email_service_enabled';           // master kill-switch
const EMAIL_VERIFICATION_ENABLED_KEY = 'email_verification_enabled'; // send verification emails
const EMAIL_VERIFICATION_REQUIRED_KEY = 'email_verification_required';
const EMAIL_PASSWORD_RESET_ENABLED_KEY = 'email_password_reset_enabled';
const EMAIL_REPORTS_ENABLED_KEY = 'email_reports_enabled';
const EMAIL_REPORTS_FREQUENCY_KEY = 'email_reports_frequency';       // 'daily' | 'weekly'
const EMAIL_REPORTS_LAST_SENT_KEY = 'email_reports_last_sent';       // internal book-keeping (ISO date)
const EMAIL_REPORT_FIELDS_KEY = 'email_report_fields';               // which fields appear in the report

// Catalog of report fields (key -> Arabic label). Order here = order in email.
const REPORT_FIELD_CATALOG = [
  { key: 'grades_count', label: 'عدد الدرجات المسجلة' },
  { key: 'grades_average', label: 'متوسط الدرجات' },
  { key: 'attendance_present', label: 'أيام الحضور' },
  { key: 'attendance_absent', label: 'أيام الغياب' },
  { key: 'attendance_rate', label: 'نسبة الحضور' },
  { key: 'points', label: 'النقاط المكتسبة' },
  { key: 'memorization', label: 'التقدم في الحفظ' },
  { key: 'goal', label: 'هدف الفصل الحالي' },
];

// Defaults: the original five on, the newer three off.
const DEFAULT_REPORT_FIELDS = {
  grades_count: true,
  grades_average: true,
  attendance_present: true,
  attendance_absent: true,
  attendance_rate: false,
  points: true,
  memorization: false,
  goal: false,
};

async function getBooleanSetting(key, defaultValue = false, client = db) {
  const result = await client.query(
    'SELECT value FROM app_settings WHERE key = $1',
    [key]
  );

  if (result.rows.length === 0) {
    return defaultValue;
  }

  return result.rows[0].value === true;
}

async function setBooleanSetting(key, value, updatedBy, client = db) {
  const result = await client.query(
    `INSERT INTO app_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = NOW()
     RETURNING key, value, updated_at`,
    [key, JSON.stringify(Boolean(value)), updatedBy || null]
  );

  return result.rows[0];
}

async function isStudentAutoActivationEnabled(client = db) {
  return getBooleanSetting(STUDENT_AUTO_ACTIVATION_KEY, false, client);
}

async function getNumberSetting(key, defaultValue = 0, client = db) {
  const result = await client.query(
    'SELECT value FROM app_settings WHERE key = $1',
    [key]
  );

  if (result.rows.length === 0) {
    return defaultValue;
  }

  const value = Number(result.rows[0].value);
  return Number.isFinite(value) ? value : defaultValue;
}

async function setNumberSetting(key, value, updatedBy, client = db) {
  const numericValue = Number(value);
  const result = await client.query(
    `INSERT INTO app_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = NOW()
     RETURNING key, value, updated_at`,
    [key, JSON.stringify(Number.isFinite(numericValue) ? numericValue : 0), updatedBy || null]
  );

  return result.rows[0];
}

async function getCertificatePassThreshold(client = db) {
  return getNumberSetting(CERTIFICATE_PASS_THRESHOLD_KEY, DEFAULT_CERTIFICATE_PASS_THRESHOLD, client);
}

async function setCertificatePassThreshold(value, updatedBy, client = db) {
  // Clamp to a sane 0-100 percentage range.
  let numericValue = Number(value);
  if (!Number.isFinite(numericValue)) numericValue = DEFAULT_CERTIFICATE_PASS_THRESHOLD;
  numericValue = Math.min(100, Math.max(0, numericValue));
  return setNumberSetting(CERTIFICATE_PASS_THRESHOLD_KEY, numericValue, updatedBy, client);
}

async function getStringSetting(key, defaultValue = '', client = db) {
  const result = await client.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  if (result.rows.length === 0) return defaultValue;
  const value = result.rows[0].value;
  return typeof value === 'string' ? value : (value ?? defaultValue);
}

async function setStringSetting(key, value, updatedBy, client = db) {
  const result = await client.query(
    `INSERT INTO app_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING key, value, updated_at`,
    [key, JSON.stringify(String(value)), updatedBy || null]
  );
  return result.rows[0];
}

async function isEmailServiceEnabled(client = db) {
  return getBooleanSetting(EMAIL_SERVICE_ENABLED_KEY, false, client);
}
async function isEmailVerificationEnabled(client = db) {
  return getBooleanSetting(EMAIL_VERIFICATION_ENABLED_KEY, false, client);
}
async function isEmailVerificationRequired(client = db) {
  return getBooleanSetting(EMAIL_VERIFICATION_REQUIRED_KEY, false, client);
}
async function isEmailPasswordResetEnabled(client = db) {
  return getBooleanSetting(EMAIL_PASSWORD_RESET_ENABLED_KEY, false, client);
}
async function isEmailReportsEnabled(client = db) {
  return getBooleanSetting(EMAIL_REPORTS_ENABLED_KEY, false, client);
}

// Merge stored overrides over the defaults so new catalog fields appear too.
async function getEmailReportFields(client = db) {
  const result = await client.query('SELECT value FROM app_settings WHERE key = $1', [EMAIL_REPORT_FIELDS_KEY]);
  const stored = result.rows[0]?.value;
  const merged = { ...DEFAULT_REPORT_FIELDS };
  if (stored && typeof stored === 'object') {
    for (const { key } of REPORT_FIELD_CATALOG) {
      if (typeof stored[key] === 'boolean') merged[key] = stored[key];
    }
  }
  return merged;
}

async function setEmailReportFields(fields, updatedBy, client = db) {
  const clean = {};
  for (const { key } of REPORT_FIELD_CATALOG) {
    clean[key] = Boolean(fields?.[key]);
  }
  await client.query(
    `INSERT INTO app_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [EMAIL_REPORT_FIELDS_KEY, JSON.stringify(clean), updatedBy || null]
  );
  return clean;
}
async function getEmailReportsFrequency(client = db) {
  const value = await getStringSetting(EMAIL_REPORTS_FREQUENCY_KEY, 'weekly', client);
  return value === 'daily' ? 'daily' : 'weekly';
}

module.exports = {
  STUDENT_AUTO_ACTIVATION_KEY,
  CERTIFICATE_PASS_THRESHOLD_KEY,
  DEFAULT_CERTIFICATE_PASS_THRESHOLD,
  EMAIL_SERVICE_ENABLED_KEY,
  EMAIL_VERIFICATION_ENABLED_KEY,
  EMAIL_VERIFICATION_REQUIRED_KEY,
  EMAIL_PASSWORD_RESET_ENABLED_KEY,
  EMAIL_REPORTS_ENABLED_KEY,
  EMAIL_REPORTS_FREQUENCY_KEY,
  EMAIL_REPORTS_LAST_SENT_KEY,
  EMAIL_REPORT_FIELDS_KEY,
  REPORT_FIELD_CATALOG,
  DEFAULT_REPORT_FIELDS,
  getEmailReportFields,
  setEmailReportFields,
  getBooleanSetting,
  setBooleanSetting,
  getStringSetting,
  setStringSetting,
  isStudentAutoActivationEnabled,
  isEmailServiceEnabled,
  isEmailVerificationEnabled,
  isEmailVerificationRequired,
  isEmailPasswordResetEnabled,
  isEmailReportsEnabled,
  getEmailReportsFrequency,
  getNumberSetting,
  setNumberSetting,
  getCertificatePassThreshold,
  setCertificatePassThreshold
};
