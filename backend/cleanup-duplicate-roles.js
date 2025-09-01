const db = require('./config/database');

async function cleanupDuplicateRoles() {
  const client = await db.connect();
  
  try {
    console.log('Finding users with multiple roles...\n');
    
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
      console.log('No users with duplicate roles found.');
      return;
    }
    
    console.log(`Found ${duplicateCheck.rows.length} users with multiple roles:\n`);
    
    for (const user of duplicateCheck.rows) {
      console.log(`User: ${user.id} - ${user.first_name} ${user.last_name}`);
      
      const roles = [];
      if (user.in_students > 0) roles.push('student');
      if (user.in_parents > 0) roles.push('parent');
      if (user.in_teachers > 0) roles.push('teacher');
      if (user.in_administrators > 0) roles.push('administrator');
      if (user.in_admins > 0) roles.push('admin');
      if (user.in_supervisors > 0) roles.push('supervisor');
      
      console.log(`  Current roles: ${roles.join(', ')}`);
      
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
      
      console.log(`  Intended role: ${intendedRole}`);
      
      // Clean up duplicate entries (keep only the intended role)
      await client.query('BEGIN');
      
      try {
        // Remove from tables where they shouldn't be
        if (intendedRole !== 'student' && user.in_students > 0) {
          await client.query('DELETE FROM students WHERE id = $1', [user.id]);
          console.log(`  ✓ Removed from students table`);
        }
        if (intendedRole !== 'parent' && intendedRole !== 'parent_student' && user.in_parents > 0) {
          await client.query('DELETE FROM parents WHERE id = $1', [user.id]);
          console.log(`  ✓ Removed from parents table`);
        }
        if (intendedRole !== 'teacher' && user.in_teachers > 0) {
          await client.query('DELETE FROM teachers WHERE id = $1', [user.id]);
          console.log(`  ✓ Removed from teachers table`);
        }
        if (intendedRole !== 'administrator' && user.in_administrators > 0) {
          await client.query('DELETE FROM administrators WHERE id = $1', [user.id]);
          console.log(`  ✓ Removed from administrators table`);
        }
        if (intendedRole !== 'admin' && user.in_admins > 0) {
          await client.query('DELETE FROM admins WHERE id = $1', [user.id]);
          console.log(`  ✓ Removed from admins table`);
        }
        if (intendedRole !== 'supervisor' && user.in_supervisors > 0) {
          await client.query('DELETE FROM supervisors WHERE id = $1', [user.id]);
          console.log(`  ✓ Removed from supervisors table`);
        }
        
        await client.query('COMMIT');
        console.log(`  ✅ Cleanup completed for user ${user.id}\n`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Error cleaning up user ${user.id}:`, error.message);
      }
    }
    
    console.log('\nCleanup process completed!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run with confirmation
console.log('This script will clean up users who exist in multiple role tables.');
console.log('It will keep the highest priority role and remove duplicates.\n');
console.log('Priority order: admin > administrator > supervisor > teacher > parent > student\n');

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
    console.log('Cleanup cancelled.');
    rl.close();
    process.exit(0);
  }
});