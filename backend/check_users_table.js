const db = require('./db');

(async () => {
  try {
    // Check if role column exists
    const columnsResult = await db.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Check a sample user
    const sampleUser = await db.query(`
      SELECT id, role, is_active 
      FROM users 
      LIMIT 5
    `);
    
    console.log('\nSample users:');
    sampleUser.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Role: ${user.role}, Active: ${user.is_active}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();