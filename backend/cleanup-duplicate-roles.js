const db = require('./config/database');

async function cleanupDuplicateRoles() {
  const client = await db.connect();
  
  try {
    
    // Find users who exist in multiple role tables
    const duplicateCheck = await client.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        (SELECT COUNT(*) FROM students WHERE id = u.id) as in_students,
        (SELECT COUNT(*) FROM parents WHERE id = u.id) as in_parents,
        (SELECT COUNT(*) FROM teachers WHERE id = u.id) as in_teachers,
        (SELECT COUNT(*) FROM administrators WHERE id = u.id) as in_administrators,
        (SELECT COUNT(*) FROM admins WHERE id = u.id) as in_admins,
        (SELECT COUNT(*) FROM supervisors WHERE id = u.id) as in_supervisors
      FROM users u
      WHERE (
        (SELECT COUNT(*) FROM students WHERE id = u.id) +
        (SELECT COUNT(*) FROM parents WHERE id = u.id) +
        (SELECT COUNT(*) FROM teachers WHERE id = u.id) +
        (SELECT COUNT(*) FROM administrators WHERE id = u.id) +
        (SELECT COUNT(*) FROM admins WHERE id = u.id) +
        (SELECT COUNT(*) FROM supervisors WHERE id = u.id)
      ) > 1
      ORDER BY u.created_at DESC
    `);
    
    if (duplicateCheck.rows.length === 0) {
      return;
    }
    
    
    for (const user of duplicateCheck.rows) {
      
      const roles = [];
      if (user.in_students > 0) roles.push('student');
      if (user.in_parents > 0) roles.push('parent');
      if (user.in_teachers > 0) roles.push('teacher');
      if (user.in_administrators > 0) roles.push('administrator');
      if (user.in_admins > 0) roles.push('admin');
      if (user.in_supervisors > 0) roles.push('supervisor');
      
      
      // Determine the intended role based on priority
      let intendedRole = null;
      if (user.in_admins > 0) {
        intendedRole = 'admin';
      } else if (user.in_administrators > 0) {
        intendedRole = 'administrator';
      } else if (user.in_supervisors > 0) {
        intendedRole = 'supervisor';
      } else if (user.in_teachers > 0) {
        intendedRole = 'teacher';
      } else if (user.in_parents > 0 && user.in_students > 0) {
        intendedRole = 'parent_student';
      } else if (user.in_parents > 0) {
        intendedRole = 'parent';
      } else if (user.in_students > 0) {
        intendedRole = 'student';
      }
      
      
      // Clean up duplicate entries (keep only the intended role)
      await client.query('BEGIN');
      
      try {
        // Remove from tables where they shouldn't be
        if (intendedRole !== 'student' && user.in_students > 0) {
          await client.query('DELETE FROM students WHERE id = $1', [user.id]);
        }
        if (intendedRole !== 'parent' && intendedRole !== 'parent_student' && user.in_parents > 0) {
          await client.query('DELETE FROM parents WHERE id = $1', [user.id]);
        }
        if (intendedRole !== 'teacher' && user.in_teachers > 0) {
          await client.query('DELETE FROM teachers WHERE id = $1', [user.id]);
        }
        if (intendedRole !== 'administrator' && user.in_administrators > 0) {
          await client.query('DELETE FROM administrators WHERE id = $1', [user.id]);
        }
        if (intendedRole !== 'admin' && user.in_admins > 0) {
          await client.query('DELETE FROM admins WHERE id = $1', [user.id]);
        }
        if (intendedRole !== 'supervisor' && user.in_supervisors > 0) {
          await client.query('DELETE FROM supervisors WHERE id = $1', [user.id]);
        }
        
        await client.query('COMMIT');
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Error cleaning up user ${user.id}:`, error.message);
      }
    }
    
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run with confirmation

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Do you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    rl.close();
    cleanupDuplicateRoles();
  } else {
    rl.close();
    process.exit(0);
  }
});