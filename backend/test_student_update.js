const pool = require('./db');

async function testStudentUpdate() {
    try {
        console.log('🔍 Testing student memorization update...');
        
        // Test data - updating memorization and goal
        const testData = {
            school_level: 'الأول الابتدائي',
            status: 'active',
            memorized_surah_id: 113, // الفلق
            memorized_ayah_number: 5,
            target_surah_id: 112, // الإخلاص  
            target_ayah_number: 4
        };
        
        const result = await pool.query(`
            UPDATE students 
            SET school_level = $1, status = $2, notes = $3,
                memorized_surah_id = $4, memorized_ayah_number = $5,
                target_surah_id = $6, target_ayah_number = $7
            WHERE id = $8
            RETURNING memorized_surah_id, memorized_ayah_number, target_surah_id, target_ayah_number
        `, [
            testData.school_level, testData.status, null,
            testData.memorized_surah_id, testData.memorized_ayah_number,
            testData.target_surah_id, testData.target_ayah_number,
            '1122334444'
        ]);
        
        console.log('✅ Updated student memorization data:', result.rows[0]);
        
        // Verify the update worked
        const check = await pool.query(`
            SELECT memorized_surah_id, memorized_ayah_number, target_surah_id, target_ayah_number
            FROM students WHERE id = $1
        `, ['1122334444']);
        
        console.log('📊 Current memorization data:', check.rows[0]);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testStudentUpdate()
    .then(() => {
        console.log('\n🎉 Student update test completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Test failed:', error);
        process.exit(1);
    });