const db = require('./config/database');

async function testClassesBySchool() {
  try {
    // Get all classes with school info
    const result = await db.query(`
      SELECT 
        c.id, 
        c.name as class_name, 
        s.id as school_id,
        s.name as school_name
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.id
      ORDER BY s.name, c.name
    `);
    
    console.log('Classes by school:');
    console.log('=================\n');
    
    // Group by school
    const bySchool = {};
    result.rows.forEach(row => {
      const schoolName = row.school_name || 'No School Assigned';
      if (!bySchool[schoolName]) {
        bySchool[schoolName] = [];
      }
      bySchool[schoolName].push({
        id: row.id,
        name: row.class_name,
        school_id: row.school_id
      });
    });
    
    // Display grouped results
    Object.keys(bySchool).sort().forEach(schoolName => {
      console.log(`${schoolName}:`);
      bySchool[schoolName].forEach(cls => {
        console.log(`  - ${cls.name} (ID: ${cls.id})`);
      });
      console.log('');
    });
    
    // Test filtering by specific school
    const schools = await db.query('SELECT id, name FROM schools LIMIT 1');
    if (schools.rows.length > 0) {
      const testSchoolId = schools.rows[0].id;
      console.log(`\nTesting filter for school: ${schools.rows[0].name} (${testSchoolId})`);
      console.log('==========================================');
      
      const filtered = await db.query(`
        SELECT c.id, c.name
        FROM classes c
        WHERE c.school_id = $1
      `, [testSchoolId]);
      
      console.log(`Found ${filtered.rows.length} classes:`);
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

testClassesBySchool();