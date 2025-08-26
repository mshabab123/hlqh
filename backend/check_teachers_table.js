const db = require('./db');

(async () => {
  try {
    // Check teachers table columns
    const columnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'teachers' 
      ORDER BY ordinal_position
    `);
    
    console.log('Teachers table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if status column exists
    const hasStatus = columnsResult.rows.some(col => col.column_name === 'status');
    console.log(`\nStatus column exists: ${hasStatus}`);
    
    if (!hasStatus) {
      console.log('\n⚠️  The teachers table is missing the "status" column!');
      console.log('This is causing the 403 error.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();