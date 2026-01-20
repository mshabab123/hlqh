// migrate.js - Database migration script
const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting database migration...');

    // Read the SQL file
    const sqlFilePath = path.join('c:', 'Users', 'mshbb', 'OneDrive', 'Desktop', 'update-fixed.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📖 SQL file loaded successfully');

    // Begin transaction
    await client.query('BEGIN');
    console.log('🔓 Transaction started');

    // Execute the SQL
    await client.query(sql);
    console.log('✅ SQL executed successfully');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed');
    console.log('🎉 Database migration completed successfully!');

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
