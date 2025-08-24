const pool = require('./db');

async function removeDuplicateGoalColumns() {
    let client;
    try {
        console.log('🔧 Removing duplicate goal columns from students table...');
        
        client = await pool.connect();
        
        // First, migrate any existing data from goal columns to target columns
        console.log('📋 Migrating existing goal data to target columns...');
        
        const migrationResult = await client.query(`
            UPDATE students 
            SET target_surah_id = CASE 
                WHEN goal_surah IS NOT NULL THEN (
                    CASE goal_surah
                        WHEN 'الناس' THEN 114
                        WHEN 'الفلق' THEN 113  
                        WHEN 'الإخلاص' THEN 112
                        WHEN 'المسد' THEN 111
                        WHEN 'النصر' THEN 110
                        WHEN 'الكافرون' THEN 109
                        WHEN 'الكوثر' THEN 108
                        WHEN 'الماعون' THEN 107
                        WHEN 'قريش' THEN 106
                        WHEN 'الفيل' THEN 105
                        WHEN 'الهمزة' THEN 104
                        WHEN 'العصر' THEN 103
                        WHEN 'التكاثر' THEN 102
                        WHEN 'القارعة' THEN 101
                        WHEN 'العاديات' THEN 100
                        WHEN 'الزلزلة' THEN 99
                        WHEN 'البينة' THEN 98
                        WHEN 'القدر' THEN 97
                        WHEN 'العلق' THEN 96
                        WHEN 'التين' THEN 95
                        WHEN 'الشرح' THEN 94
                        WHEN 'الضحى' THEN 93
                        WHEN 'الليل' THEN 92
                        WHEN 'الشمس' THEN 91
                        WHEN 'البلد' THEN 90
                        WHEN 'الفجر' THEN 89
                        WHEN 'الغاشية' THEN 88
                        WHEN 'الأعلى' THEN 87
                        WHEN 'الطارق' THEN 86
                        WHEN 'البروج' THEN 85
                        WHEN 'البقرة' THEN 2
                        WHEN 'آل عمران' THEN 3
                        WHEN 'النساء' THEN 4
                        WHEN 'المائدة' THEN 5
                        WHEN 'الأنعام' THEN 6
                        WHEN 'الأعراف' THEN 7
                        WHEN 'الأنفال' THEN 8
                        WHEN 'التوبة' THEN 9
                        WHEN 'يونس' THEN 10
                        ELSE NULL
                    END
                )
                ELSE target_surah_id
            END,
            target_ayah_number = CASE 
                WHEN goal_end_verse IS NOT NULL THEN goal_end_verse
                ELSE target_ayah_number
            END
            WHERE goal_surah IS NOT NULL OR goal_start_verse IS NOT NULL OR goal_end_verse IS NOT NULL
        `);
        
        console.log('✅ Migrated', migrationResult.rowCount, 'goal records to target fields');
        
        // Check if the duplicate columns exist before dropping them
        const columnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'students' 
            AND column_name IN ('goal_surah', 'goal_start_verse', 'goal_end_verse', 'goal_set_date', 'goal_target_date')
        `);
        
        if (columnsCheck.rows.length > 0) {
            console.log('📊 Found duplicate columns:', columnsCheck.rows.map(r => r.column_name));
            
            // Drop the duplicate goal columns
            await client.query(`
                ALTER TABLE students 
                DROP COLUMN IF EXISTS goal_surah,
                DROP COLUMN IF EXISTS goal_start_verse,
                DROP COLUMN IF EXISTS goal_end_verse,
                DROP COLUMN IF EXISTS goal_set_date,
                DROP COLUMN IF EXISTS goal_target_date
            `);
            
            console.log('✅ Removed duplicate goal columns');
        } else {
            console.log('✅ No duplicate goal columns found');
        }
        
        // Check current structure
        const structure = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'students' 
            AND (column_name LIKE '%target%' OR column_name LIKE '%goal%' OR column_name LIKE '%memor%')
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Current goal-related columns in students table:');
        structure.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
        
    } catch (error) {
        console.error('❌ Error removing duplicate goal columns:', error.message);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Run the cleanup
removeDuplicateGoalColumns()
    .then(() => {
        console.log('\n🎉 Duplicate goal columns cleanup completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Cleanup failed:', error);
        process.exit(1);
    });