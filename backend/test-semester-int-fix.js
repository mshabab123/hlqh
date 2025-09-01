const db = require('./config/database');

async function testSemesterIntFix() {
  try {
    console.log('Testing Semester ID Integer Conversion Fix');
    console.log('==========================================\n');

    // Get all classes with their semester info
    const classes = await db.query(`
      SELECT 
        c.id, c.name, c.semester_id, c.school_id,
        s.type, s.year, s.display_name as semester_name,
        sc.name as school_name
      FROM classes c
      LEFT JOIN semesters s ON c.semester_id = s.id
      LEFT JOIN schools sc ON c.school_id = sc.id
      ORDER BY sc.name, s.year, s.type
    `);

    console.log('All classes with semester info:');
    classes.rows.forEach(c => {
      console.log(`  - ${c.name}`);
      console.log(`    School: ${c.school_name} (${c.school_id})`);
      console.log(`    Semester: ${c.semester_name} (ID: ${c.semester_id})`);
      console.log('');
    });

    // Test filtering with string semester_id (as frontend sends)
    console.log('Testing filters:');
    console.log('================');

    // Test 1: School "حلقات جامع الخلفاء الراشدين" + Semester 6 (first 2025)
    const school1 = '528fbc27-a306-4394-b2cb-9d0cca8cade6';
    const semester1 = '6'; // String as frontend sends

    console.log(`1. School: حلقات جامع الخلفاء الراشدين + Semester: ${semester1} (first 2025)`);
    const result1 = await db.query(`
      SELECT c.id, c.name 
      FROM classes c 
      WHERE c.school_id = $1 AND c.semester_id = $2
    `, [school1, parseInt(semester1)]);
    
    console.log(`   Found ${result1.rows.length} classes:`);
    result1.rows.forEach(c => console.log(`     - ${c.name}`));

    // Test 2: Same school + Semester 8 (second 2025)
    const semester2 = '8'; // String as frontend sends

    console.log(`\n2. School: حلقات جامع الخلفاء الراشدين + Semester: ${semester2} (second 2025)`);
    const result2 = await db.query(`
      SELECT c.id, c.name 
      FROM classes c 
      WHERE c.school_id = $1 AND c.semester_id = $2
    `, [school1, parseInt(semester2)]);
    
    console.log(`   Found ${result2.rows.length} classes:`);
    result2.rows.forEach(c => console.log(`     - ${c.name}`));

    // Test 3: School "الشبلان" + Semester 7 (first 2025)
    const school2 = 'c9e23ffa-7618-4536-9122-33250c527bbd';
    const semester3 = '7'; // String as frontend sends

    console.log(`\n3. School: الشبلان + Semester: ${semester3} (first 2025)`);
    const result3 = await db.query(`
      SELECT c.id, c.name 
      FROM classes c 
      WHERE c.school_id = $1 AND c.semester_id = $2
    `, [school2, parseInt(semester3)]);
    
    console.log(`   Found ${result3.rows.length} classes:`);
    result3.rows.forEach(c => console.log(`     - ${c.name}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testSemesterIntFix();