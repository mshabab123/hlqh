const db = require('../config/database');

const STUDENT_AUTO_ACTIVATION_KEY = 'student_auto_activation_enabled';

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

module.exports = {
  STUDENT_AUTO_ACTIVATION_KEY,
  getBooleanSetting,
  setBooleanSetting,
  isStudentAutoActivationEnabled
};
