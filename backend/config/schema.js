const db = require('./database');

async function ensureAuthSchema() {
  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS lockout_until timestamptz
  `);
}

async function ensureSchema() {
  await ensureAuthSchema();
}

module.exports = {
  ensureAuthSchema,
  ensureSchema,
};
