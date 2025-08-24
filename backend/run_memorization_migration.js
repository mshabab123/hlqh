const pool = require('./db');

async function addMemorizationProgressColumns() {
    let client;
    try {
        console.log('🔧 Adding memorization progress columns to students table...');
        
        client = await pool.connect();
        
        // Add memorization progress columns
        await client.query(`
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS memorized_surah_id INTEGER,
            ADD COLUMN IF NOT EXISTS memorized_ayah_number INTEGER,
            ADD COLUMN IF NOT EXISTS target_surah_id INTEGER,
            ADD COLUMN IF NOT EXISTS target_ayah_number INTEGER,
            ADD COLUMN IF NOT EXISTS last_memorization_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        
        console.log('✅ Added memorization progress columns');
        
        // Add index
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_students_memorization_progress 
            ON students(memorized_surah_id, memorized_ayah_number)
        `);
        
        console.log('✅ Added memorization progress index');
        
        // Check the updated structure
        const structure = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'students' 
            AND column_name LIKE '%memoriz%'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Memorization columns in students table:');
        structure.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
        
    } catch (error) {
        console.error('❌ Error adding memorization progress columns:', error.message);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Run the migration
addMemorizationProgressColumns()
    .then(() => {
        console.log('\n🎉 Memorization progress columns added successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });