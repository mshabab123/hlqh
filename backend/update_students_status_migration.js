// Migration script to update students table default status to inactive
const db = require('./db');

async function updateStudentsStatus() {
  const client = await db.connect();
  
  try {
    console.log('Updating students table default status to inactive...');
    
    await client.query('BEGIN');
    
    // First, we need to update the check constraint to allow 'inactive' status
    console.log('Updating students status check constraint...');
    await client.query(`
      ALTER TABLE students 
      DROP CONSTRAINT IF EXISTS students_status_check
    `);
    
    await client.query(`
      ALTER TABLE students 
      ADD CONSTRAINT students_status_check 
      CHECK (status IN ('active', 'graduated', 'suspended', 'withdrawn', 'inactive'))
    `);
    
    // Update default status to inactive
    console.log('Setting default status to inactive...');
    await client.query("ALTER TABLE students ALTER COLUMN status SET DEFAULT 'inactive'");
    
    await client.query('COMMIT');
    console.log('✅ Students table updated successfully!');
    console.log('Students will now register as inactive by default');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

updateStudentsStatus();