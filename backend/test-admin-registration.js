const db = require('./config/database');

async function testAdminRegistration() {
  const testId = '9999999999';
  
  try {
    console.log('Testing administrator registration and login flow...\n');
    
    // 1. Check if user exists in any table
    console.log('1. Checking existing records for ID:', testId);
    const userCheck = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        (SELECT COUNT(*) FROM students WHERE id = u.id) as in_students,
        (SELECT COUNT(*) FROM administrators WHERE id = u.id) as in_administrators,
        (SELECT COUNT(*) FROM teachers WHERE id = u.id) as in_teachers,
        (SELECT COUNT(*) FROM parents WHERE id = u.id) as in_parents,
        (SELECT COUNT(*) FROM supervisors WHERE id = u.id) as in_supervisors,
        (SELECT COUNT(*) FROM admins WHERE id = u.id) as in_admins
      FROM users u 
      WHERE u.id = $1
    `, [testId]);
    
    if (userCheck.rows.length > 0) {
      const user = userCheck.rows[0];
      console.log('User exists:', user);
      
      // Check which table they're in
      if (user.in_students > 0) console.log('  - Found in STUDENTS table');
      if (user.in_administrators > 0) console.log('  - Found in ADMINISTRATORS table');
      if (user.in_teachers > 0) console.log('  - Found in TEACHERS table');
      if (user.in_parents > 0) console.log('  - Found in PARENTS table');
      if (user.in_supervisors > 0) console.log('  - Found in SUPERVISORS table');
      if (user.in_admins > 0) console.log('  - Found in ADMINS table');
    } else {
      console.log('No existing user found with this ID');
    }
    
    // 2. Test login query for this user
    console.log('\n2. Testing login query to determine role:');
    const loginQuery = await db.query(`
      SELECT 
        u.id, u.first_name,
        CASE 
          WHEN p.id IS NOT NULL AND s.id IS NOT NULL THEN 'parent_student'
          WHEN p.id IS NOT NULL THEN 'parent'
          WHEN s.id IS NOT NULL THEN 'student'
          WHEN a.id IS NOT NULL THEN 'admin'
          WHEN ad.id IS NOT NULL THEN 'administrator'
          WHEN sv.id IS NOT NULL THEN 'supervisor'
          WHEN t.id IS NOT NULL THEN 'teacher'
          ELSE 'user'
        END as role
      FROM users u
      LEFT JOIN parents p ON u.id = p.id
      LEFT JOIN students s ON u.id = s.id
      LEFT JOIN teachers t ON u.id = t.id
      LEFT JOIN admins a ON u.id = a.id
      LEFT JOIN administrators ad ON u.id = ad.id
      LEFT JOIN supervisors sv ON u.id = sv.id
      WHERE u.id = $1
    `, [testId]);
    
    if (loginQuery.rows.length > 0) {
      console.log('Login query result - Role:', loginQuery.rows[0].role);
    } else {
      console.log('User not found in login query');
    }
    
    // 3. Check administrators table specifically
    console.log('\n3. Checking administrators table directly:');
    const adminCheck = await db.query(`
      SELECT id, role, qualifications, salary 
      FROM administrators 
      WHERE id = $1
    `, [testId]);
    
    if (adminCheck.rows.length > 0) {
      console.log('Administrator record:', adminCheck.rows[0]);
    } else {
      console.log('No administrator record found');
    }
    
    // 4. List all recent users to see patterns
    console.log('\n4. Recent registrations (last 24 hours):');
    const recentUsers = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.created_at,
        CASE 
          WHEN s.id IS NOT NULL THEN 'student'
          WHEN ad.id IS NOT NULL THEN 'administrator'
          WHEN t.id IS NOT NULL THEN 'teacher'
          WHEN p.id IS NOT NULL THEN 'parent'
          WHEN sv.id IS NOT NULL THEN 'supervisor'
          WHEN a.id IS NOT NULL THEN 'admin'
          ELSE 'no_role'
        END as actual_role
      FROM users u
      LEFT JOIN students s ON u.id = s.id
      LEFT JOIN administrators ad ON u.id = ad.id
      LEFT JOIN teachers t ON u.id = t.id
      LEFT JOIN parents p ON u.id = p.id
      LEFT JOIN supervisors sv ON u.id = sv.id
      LEFT JOIN admins a ON u.id = a.id
      WHERE u.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    
    console.log('Recent users:');
    recentUsers.rows.forEach(user => {
      console.log(`  - ${user.id}: ${user.first_name} (${user.actual_role}) - Created: ${user.created_at}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testAdminRegistration();