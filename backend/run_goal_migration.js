const pool = require('./db');

async function addGoalColumns() {
    let client;
    try {
        console.log('🔧 Adding goal columns to students table...');
        
        client = await pool.connect();
        
        // Add goal columns
        await client.query(`
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS goal_surah VARCHAR(100),
            ADD COLUMN IF NOT EXISTS goal_start_verse INTEGER,
            ADD COLUMN IF NOT EXISTS goal_end_verse INTEGER,
            ADD COLUMN IF NOT EXISTS goal_set_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS goal_target_date DATE
        `);
        
        console.log('✅ Added goal columns to students table');
        
        // Add index
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_students_goal 
            ON students(goal_surah, goal_start_verse, goal_end_verse)
        `);
        
        console.log('✅ Added goal index');
        
        // Check the updated structure
        const structure = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'students' 
            AND column_name LIKE 'goal%'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Goal columns in students table:');
        structure.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
        
    } catch (error) {
        console.error('❌ Error adding goal columns:', error.message);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Run the migration
addGoalColumns()
    .then(() => {
        console.log('\n🎉 Goal columns added successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });