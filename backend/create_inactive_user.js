const db = require('./db');
const bcrypt = require('bcryptjs');

async function createInactiveUser() {
  try {
    console.log('Creating inactive test user...');
    
    const testUserId = '1234567890';
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // First, check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE id = $1', [testUserId]);
    
    if (existingUser.rows.length > 0) {
      console.log('User already exists, updating password and setting to inactive status...');
      await db.query('UPDATE users SET is_active = false, password = $2 WHERE id = $1', [testUserId, hashedPassword]);
    } else {
      // Create new inactive user
      await db.query(`
        INSERT INTO users (id, first_name, second_name, third_name, last_name, email, phone, password, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        testUserId, 
        'أحمد', 
        'محمد', 
        'عبدالله',
        'الغامدي',
        'ahmed.test@example.com',
        '0501234567',
        hashedPassword,
        false  // inactive
      ]);

      // Create student record for this user
      await db.query(`
        INSERT INTO students (id, school_level, status)
        VALUES ($1, $2, $3)
      `, [testUserId, 'ثانوي', 'active']);

      console.log('✅ Inactive test user created successfully!');
    }
    
    console.log('Test Login Credentials:');
    console.log('رقم الهوية: 1234567890');
    console.log('كلمة المرور: 123456');
    console.log('Status: Inactive (pending activation)');
    
  } catch (error) {
    console.error('Error creating inactive user:', error);
  } finally {
    process.exit();
  }
}

createInactiveUser();