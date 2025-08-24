const db = require('./db');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test schools
    const schoolsResult = await db.query('SELECT id, name FROM schools LIMIT 5');
    console.log('Schools:', schoolsResult.rows.length, 'found');
    console.log(schoolsResult.rows);
    
    // Test classes
    const classesResult = await db.query('SELECT id, name, school_id FROM classes LIMIT 5');
    console.log('Classes:', classesResult.rows.length, 'found');
    console.log(classesResult.rows);
    
    // Test students
    const studentsResult = await db.query('SELECT COUNT(*) FROM students');
    console.log('Students:', studentsResult.rows[0].count, 'found');
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    process.exit();
  }
}

testDatabase();