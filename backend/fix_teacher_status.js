const db = require('./config/database');

(async () => {
  try {
    console.log('Fixing teacher employment status...');
    
    // Update teachers
    const teacherUpdate = await db.query(`
      UPDATE teachers 
      SET status = 'active' 
      WHERE status = 'inactive' OR status IS NULL
    `);
    console.log(`Updated ${teacherUpdate.rowCount} teacher records`);
    
    // Update administrators
    const adminUpdate = await db.query(`
      UPDATE administrators 
      SET status = 'active' 
      WHERE status = 'inactive' OR status IS NULL
    `);
    console.log(`Updated ${adminUpdate.rowCount} administrator records`);
    
    // Update supervisors
    const supervisorUpdate = await db.query(`
      UPDATE supervisors 
      SET status = 'active' 
      WHERE status = 'inactive' OR status IS NULL
    `);
    console.log(`Updated ${supervisorUpdate.rowCount} supervisor records`);
    
    // Show current status
    const statusCheck = await db.query(`
      SELECT 'Teachers' as role_type, status, COUNT(*) as count 
      FROM teachers 
      GROUP BY status
      UNION ALL
      SELECT 'Administrators', status, COUNT(*) 
      FROM administrators 
      GROUP BY status
      UNION ALL
      SELECT 'Supervisors', status, COUNT(*) 
      FROM supervisors 
      GROUP BY status
    `);
    
    console.log('\nCurrent status distribution:');
    statusCheck.rows.forEach(row => {
      console.log(`  ${row.role_type}: ${row.status} = ${row.count}`);
    });
    
    console.log('\n✅ Employment status fixed! Teachers, administrators, and supervisors can now access the dashboard.');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();