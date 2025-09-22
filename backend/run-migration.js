// Script to run the migration for cleaning up teacher school assignment redundancy
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
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('📄 Starting migration: cleanup_teacher_school_assignment.sql');
    console.log('🔌 Connected to database successfully');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'cleanup_teacher_school_assignment.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Executing migration...');

    // Execute migration
    const result = await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!');

    // The migration includes verification queries, but let's do some additional checks
    console.log('\n📊 Additional verification:');

    // Check teachers with school_id assigned
    const teachersWithSchool = await client.query(`
      SELECT COUNT(*) as count FROM teachers WHERE school_id IS NOT NULL
    `);
    console.log(`Teachers with school_id assigned: ${teachersWithSchool.rows[0].count}`);

    // Check teachers with problematic qualifications (should be 0)
    const problematicQualifications = await client.query(`
      SELECT COUNT(*) as count FROM teachers WHERE qualifications LIKE 'SCHOOL_ID:%'
    `);
    console.log(`Teachers with SCHOOL_ID in qualifications (should be 0): ${problematicQualifications.rows[0].count}`);

    // Check clean qualifications
    const cleanQualifications = await client.query(`
      SELECT COUNT(*) as count FROM teachers
      WHERE qualifications IS NOT NULL AND qualifications NOT LIKE 'SCHOOL_ID:%'
    `);
    console.log(`Teachers with clean qualifications: ${cleanQualifications.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    console.log('🏁 Migration process completed');
  }
}

// Run the migration
runMigration().catch(console.error);