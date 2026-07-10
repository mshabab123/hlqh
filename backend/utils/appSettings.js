const db = require('../config/database');

const STUDENT_AUTO_ACTIVATION_KEY = 'student_auto_activation_enabled';
const CERTIFICATE_PASS_THRESHOLD_KEY = 'certificate_pass_threshold';
const DEFAULT_CERTIFICATE_PASS_THRESHOLD = 50;
const EMAIL_SERVICE_ENABLED_KEY = 'email_service_enabled';
const EMAIL_VERIFICATION_REQUIRED_KEY = 'email_verification_required';

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

async function isEmailServiceEnabled(client = db) {
  return getBooleanSetting(EMAIL_SERVICE_ENABLED_KEY, false, client);
}

async function isEmailVerificationRequired(client = db) {
  return getBooleanSetting(EMAIL_VERIFICATION_REQUIRED_KEY, false, client);
}

module.exports = {
  STUDENT_AUTO_ACTIVATION_KEY,
  CERTIFICATE_PASS_THRESHOLD_KEY,
  DEFAULT_CERTIFICATE_PASS_THRESHOLD,
  EMAIL_SERVICE_ENABLED_KEY,
  EMAIL_VERIFICATION_REQUIRED_KEY,
  getBooleanSetting,
  setBooleanSetting,
  isStudentAutoActivationEnabled,
  isEmailServiceEnabled,
  isEmailVerificationRequired,
  getNumberSetting,
  setNumberSetting,
  getCertificatePassThreshold,
  setCertificatePassThreshold
};
