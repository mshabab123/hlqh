const db = require('./config/database');

async function testSemesterFilter() {
  try {
    // Get all classes with semester info
    console.log('Classes with semesters:');
    console.log('=====================');
    const classes = await db.query(`
      SELECT 
        c.id, 
        c.name as class_name, 
        c.semester_id,
        s.type, 
        s.year,
        s.display_name
      FROM classes c 
      LEFT JOIN semesters s ON c.semester_id = s.id
      ORDER BY s.year, s.type, c.name
    `);
    
    classes.rows.forEach(c => {
      const semesterInfo = c.type && c.year 
        ? `${c.type} ${c.year}` 
        : 'No semester assigned';
      console.log(`  - ${c.class_name} (Semester: ${semesterInfo}, ID: ${c.semester_id})`);
    });
    
    // Get all semesters
    console.log('\nAll semesters:');
    console.log('==============');
    const semesters = await db.query('SELECT id, type, year, display_name FROM semesters ORDER BY year, type');
    semesters.rows.forEach(s => {
      console.log(`  - ${s.display_name || `${s.type} ${s.year}`} (ID: ${s.id})`);
    });
    
    // Test filtering by first semester
    if (semesters.rows.length > 0) {
      const testSemesterId = semesters.rows[0].id;
      console.log(`\nTesting filter for semester: ${semesters.rows[0].display_name || `${semesters.rows[0].type} ${semesters.rows[0].year}`}`);
      console.log('============================================');
      
      const filtered = await db.query(`
        SELECT c.id, c.name, c.semester_id
        FROM classes c
        WHERE c.semester_id = $1
      `, [testSemesterId]);
      
      console.log(`Found ${filtered.rows.length} classes for this semester:`);
      filtered.rows.forEach(cls => {
        console.log(`  - ${cls.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testSemesterFilter();