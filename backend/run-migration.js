// Script to run database migrations
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
    console.log('🔄 Running migration: add_grade_type_to_semester_courses.sql');

    const migrationPath = path.join(__dirname, 'migrations', 'add_grade_type_to_semester_courses.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'semester_courses'
      AND column_name = 'grade_type'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: grade_type column exists');
      console.log('   Column details:', result.rows[0]);
    }

    // Show sample data
    const sampleData = await pool.query(`
      SELECT name, grade_type
      FROM semester_courses
      LIMIT 5
    `);

    console.log('\n📊 Sample courses with grade_type:');
    sampleData.rows.forEach(row => {
      console.log(`   - ${row.name}: ${row.grade_type}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
