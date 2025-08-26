const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'mshababalrizahs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hlaqh',
  password: process.env.DB_PASSWORD || 'MM886788648807ooO',
  port: process.env.DB_PORT || 5432,
});

async function addIsPendingColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding is_pending column to parent_student_relationships table...');
    
    await client.query('BEGIN');
    
    // Add is_pending column
    await client.query(`
      ALTER TABLE parent_student_relationships 
      ADD COLUMN IF NOT EXISTS is_pending BOOLEAN NOT NULL DEFAULT false
    `);
    console.log('✅ Added is_pending column');
    
    // Update existing relationships
    const updateResult = await client.query(`
      UPDATE parent_student_relationships 
      SET is_pending = false 
      WHERE is_pending IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} existing relationships`);
    
    // Add comment
    await client.query(`
      COMMENT ON COLUMN parent_student_relationships.is_pending IS 'True if relationship is pending (one party has not registered yet)'
    `);
    console.log('✅ Added column comment');
    
    await client.query('COMMIT');
    console.log('🎉 Successfully added is_pending column to parent_student_relationships table!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding column:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addIsPendingColumn()
  .then(() => {
    console.log('✅ Database update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database update failed:', error.message);
    process.exit(1);
  });