require('dotenv').config();

const db = require('./config/database');
const { ensureSchema } = require('./config/schema');

async function migrate() {
  try {
    await ensureSchema();
    console.log('Database schema is up to date.');
  } catch (err) {
    console.error('Database migration failed:', err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

migrate();
