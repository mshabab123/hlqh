const pool = require('./db');

async function testMemorizationSystem() {
    let client;
    try {
        client = await pool.connect();
        
        // Get a test student
        const student = await client.query('SELECT id FROM students LIMIT 1');
        if (!student.rows[0]) {
            console.log('❌ No students found');
            return;
        }
        
        const studentId = student.rows[0].id;
        console.log('🔍 Testing with student ID:', studentId);
        
        // Get a test class and course
        const classResult = await client.query('SELECT id FROM classes LIMIT 1');
        const courseResult = await client.query('SELECT id FROM semester_courses LIMIT 1');
        
        if (!classResult.rows[0] || !courseResult.rows[0]) {
            console.log('❌ Missing classes or courses');
            return;
        }
        
        const classId = classResult.rows[0].id;
        const courseId = courseResult.rows[0].id;
        
        console.log('📚 Using class:', classId, 'and course:', courseId);
        
        // Add a test memorization grade
        const gradeResult = await client.query(`
            INSERT INTO grades (student_id, class_id, course_id, grade_type, grade_value, max_grade, start_reference, end_reference, date_graded)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id
        `, [studentId, classId, courseId, 'memorization', 100, 100, 'الناس:1', 'الناس:6']);
        
        console.log('✅ Added test memorization grade with ID:', gradeResult.rows[0].id);
        
        // Check if progress was updated (this should happen via the API endpoint, but let's check current state)
        const progressCheck = await client.query(`
            SELECT memorized_surah_id, memorized_ayah_number, last_memorization_update
            FROM students 
            WHERE id = $1
        `, [studentId]);
        
        console.log('📊 Current memorization progress:', progressCheck.rows[0]);
        
        // Test the updateStudentMemorizationProgress function manually
        console.log('🔄 Now testing progress update function...');
        
        // Import the function from the routes file (we'll simulate it here)
        const grades = await client.query(`
            SELECT start_reference, end_reference, date_graded
            FROM grades 
            WHERE student_id = $1 
              AND start_reference IS NOT NULL 
              AND end_reference IS NOT NULL
              AND grade_type = 'memorization'
            ORDER BY date_graded DESC, created_at DESC
        `, [studentId]);
        
        console.log('📖 Found memorization grades:', grades.rows.length);
        
        if (grades.rows.length > 0) {
            // Find the most advanced memorization point
            let maxSurahId = 114; // Start from الناس (highest number)
            let maxAyah = 1;
            
            // Simple surah mapping for testing
            const getSurahId = (name) => {
                const mapping = {'الناس': 114, 'الفلق': 113, 'الإخلاص': 112};
                return mapping[name] || 114;
            };
            
            for (const grade of grades.rows) {
                const endRef = grade.end_reference.split(':');
                if (endRef.length === 2) {
                    const endSurahId = getSurahId(endRef[0]);
                    const endAyah = parseInt(endRef[1]);
                    
                    if (endSurahId <= maxSurahId) { // Lower = more advanced
                        maxSurahId = endSurahId;
                        maxAyah = Math.max(maxAyah, endAyah);
                    }
                }
            }
            
            // Update progress
            const updateResult = await client.query(`
                UPDATE students 
                SET memorized_surah_id = $1,
                    memorized_ayah_number = $2,
                    last_memorization_update = NOW()
                WHERE id = $3
                RETURNING memorized_surah_id, memorized_ayah_number
            `, [maxSurahId, maxAyah, studentId]);
            
            console.log('✅ Updated progress to:', updateResult.rows[0]);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            client.release();
        }
    }
}

testMemorizationSystem()
    .then(() => {
        console.log('\n🎉 Memorization system test completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Test failed:', error);
        process.exit(1);
    });