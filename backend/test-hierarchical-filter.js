const db = require('./config/database');

async function testHierarchicalFilter() {
  try {
    console.log('Testing Hierarchical Filtering: School -> Semester -> Classes');
    console.log('===============================================================\n');

    // Step 1: Get all schools
    console.log('1. Schools:');
    const schools = await db.query('SELECT id, name FROM schools ORDER BY name');
    schools.rows.forEach(school => {
      console.log(`   - ${school.name} (${school.id})`);
    });

    console.log('\n2. Semesters by School:');
    // Step 2: Get semesters for each school
    for (const school of schools.rows) {
      const semesters = await db.query(`
        SELECT id, type, year, display_name 
        FROM semesters 
        WHERE school_id = $1 
        ORDER BY year, type
      `, [school.id]);
      
      console.log(`   ${school.name}:`);
      if (semesters.rows.length === 0) {
        console.log('     - No semesters');
      } else {
        semesters.rows.forEach(sem => {
          console.log(`     - ${sem.display_name || `${sem.type} ${sem.year}`} (${sem.id})`);
        });
      }
    }

    console.log('\n3. Classes by School and Semester:');
    // Step 3: Get classes for each school-semester combination
    for (const school of schools.rows) {
      const semesters = await db.query(`
        SELECT id, type, year, display_name 
        FROM semesters 
        WHERE school_id = $1 
        ORDER BY year, type
      `, [school.id]);
      
      console.log(`   ${school.name}:`);
      
      if (semesters.rows.length === 0) {
        console.log('     - No semesters, so no classes to show');
        continue;
      }

      for (const semester of semesters.rows) {
        const classes = await db.query(`
          SELECT id, name 
          FROM classes 
          WHERE school_id = $1 AND semester_id = $2 
          ORDER BY name
        `, [school.id, semester.id]);
        
        console.log(`     ${semester.display_name || `${semester.type} ${semester.year}`}:`);
        if (classes.rows.length === 0) {
          console.log('       - No classes');
        } else {
          classes.rows.forEach(cls => {
            console.log(`       - ${cls.name}`);
          });
        }
      }
    }

    console.log('\n4. Testing API Endpoint:');
    // Test the actual endpoint filtering logic
    const testSchool = schools.rows[0];
    if (testSchool) {
      console.log(`   Testing with school: ${testSchool.name}`);
      
      // Get semesters for this school
      const schoolSemesters = await db.query(`
        SELECT id, display_name, type, year 
        FROM semesters 
        WHERE school_id = $1
      `, [testSchool.id]);
      
      if (schoolSemesters.rows.length > 0) {
        const testSemester = schoolSemesters.rows[0];
        console.log(`   Testing with semester: ${testSemester.display_name || `${testSemester.type} ${testSemester.year}`}`);
        
        // Test the same query that the API uses
        const apiResult = await db.query(`
          SELECT 
            c.id, c.name, c.school_id, c.semester_id,
            s.name as school_name,
            sem.display_name as semester_name
          FROM classes c
          LEFT JOIN schools s ON c.school_id = s.id
          LEFT JOIN semesters sem ON c.semester_id = sem.id
          WHERE c.school_id = $1 AND c.semester_id = $2
          ORDER BY c.name
        `, [testSchool.id, testSemester.id]);
        
        console.log(`   API would return ${apiResult.rows.length} classes:`);
        apiResult.rows.forEach(cls => {
          console.log(`     - ${cls.name} (${cls.school_name} -> ${cls.semester_name})`);
        });
      } else {
        console.log('   No semesters for this school to test with');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testHierarchicalFilter();