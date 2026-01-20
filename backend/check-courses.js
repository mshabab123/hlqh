const pool = require('./config/database');

async function checkCourses() {
  try {
    const result = await pool.query('SELECT name, grade_type FROM semester_courses LIMIT 20');
    console.log('Courses in database:');
    console.log('===================');
    result.rows.forEach(course => {
      console.log(`Name: ${course.name}`);
      console.log(`Type: ${course.grade_type}`);
      console.log('---');
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCourses();
