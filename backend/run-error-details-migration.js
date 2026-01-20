// Script to add error_details column to grades table
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  client_encoding: 'UTF8'
});

async function runMigration() {
  try {
    console.log('🔄 Running migration: add_error_details_to_grades.sql');

    const migrationPath = path.join(__dirname, 'migrations', 'add_error_details_to_grades.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'grades'
      AND column_name = 'error_details'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: error_details column exists');
      console.log('   Column details:', result.rows[0]);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
