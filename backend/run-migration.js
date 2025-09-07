// Script to run the migration for adding teacher roles
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
    console.log('🚀 Starting migration: Add teacher role to assignments...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_teacher_role_to_assignments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'teacher_class_assignments' 
      AND column_name = 'teacher_role'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column teacher_role added successfully:', result.rows[0]);
    }
    
    // Check how many primary teachers we have
    const primaryCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM teacher_class_assignments 
      WHERE teacher_role = 'primary' AND is_active = TRUE
    `);
    
    console.log(`📊 Primary teachers assigned: ${primaryCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);