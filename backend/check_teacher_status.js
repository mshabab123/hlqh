const db = require('./db');

(async () => {
  try {
    // Check teacher status values
    const teachersResult = await db.query(`
      SELECT t.id, t.status, u.role, u.is_active 
      FROM teachers t
      JOIN users u ON t.id = u.id
      WHERE u.role = 'teacher'
      LIMIT 5
    `);
    
    console.log('Teacher records:');
    teachersResult.rows.forEach(teacher => {
      console.log(`  ID: ${teacher.id}, Status: ${teacher.status}, Role: ${teacher.role}, Active: ${teacher.is_active}`);
    });
    
    // Count status values
    const statusCount = await db.query(`
      SELECT status, COUNT(*) as count
      FROM teachers
      GROUP BY status
    `);
    
    console.log('\nStatus distribution:');
    statusCount.rows.forEach(row => {
      console.log(`  ${row.status || 'NULL'}: ${row.count}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();