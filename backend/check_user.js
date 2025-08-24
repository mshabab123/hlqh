const db = require('./db');
const bcrypt = require('bcryptjs');

async function checkUser() {
  try {
    const testUserId = '1234567890';
    
    // Check user data
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.second_name, u.third_name, u.last_name, 
        u.email, u.phone, u.password, u.is_active,
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
      LEFT JOIN admins a ON u.id = a.id
      LEFT JOIN administrators ad ON u.id = ad.id
      LEFT JOIN supervisors sv ON u.id = sv.id
      LEFT JOIN teachers t ON u.id = t.id
      WHERE u.id = $1
    `, [testUserId]);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
    } else {
      const user = result.rows[0];
      console.log('✅ User found:');
      console.log('ID:', user.id);
      console.log('Name:', user.first_name, user.second_name, user.third_name, user.last_name);
      console.log('Email:', user.email);
      console.log('Phone:', user.phone);
      console.log('Role:', user.role);
      console.log('Is Active:', user.is_active);
      
      // Test password
      const passwordMatch = await bcrypt.compare('123456', user.password);
      console.log('Password matches:', passwordMatch);
    }
    
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    process.exit();
  }
}

checkUser();