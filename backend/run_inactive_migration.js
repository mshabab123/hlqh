// Migration script to set default status as inactive for all user types
const db = require('./db');

async function runInactiveMigration() {
  const client = await db.connect();
  
  try {
    console.log('Starting migration to set default status as inactive...');
    
    await client.query('BEGIN');
    
    // Update teachers table default status
    console.log('Updating teachers table default status...');
    await client.query("ALTER TABLE teachers ALTER COLUMN status SET DEFAULT 'inactive'");
    
    // Update administrators table default status
    console.log('Updating administrators table default status...');
    await client.query("ALTER TABLE administrators ALTER COLUMN status SET DEFAULT 'inactive'");
    
    // Update admins table default status
    console.log('Updating admins table default status...');
    await client.query("ALTER TABLE admins ALTER COLUMN status SET DEFAULT 'inactive'");
    
    // Update supervisors table default status
    console.log('Updating supervisors table default status...');
    await client.query("ALTER TABLE supervisors ALTER COLUMN status SET DEFAULT 'inactive'");
    
    // Update users table is_active default to false
    console.log('Updating users table default is_active status...');
    await client.query("ALTER TABLE users ALTER COLUMN is_active SET DEFAULT false");
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    console.log('All new user registrations will now be inactive by default');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

runInactiveMigration();