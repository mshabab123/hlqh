const pool = require('./db');

async function fixDatabase() {
    let client;
    try {
        console.log('🔧 Starting database structure fix...');
        
        client = await pool.connect();
        
        // 1. Create semesters table if it doesn't exist
        console.log('📋 Checking semesters table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS semesters (
                id SERIAL PRIMARY KEY,
                type VARCHAR(20) NOT NULL CHECK (type IN ('first', 'second', 'summer')),
                year INTEGER NOT NULL,
                display_name VARCHAR(100),
                start_date DATE,
                end_date DATE,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(type, year)
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_semesters_year_type ON semesters(year, type)
        `);
        
        console.log('✅ Semesters table ready');
        
        // 2. Create semester_courses table if it doesn't exist
        console.log('📋 Checking semester_courses table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS semester_courses (
                id SERIAL PRIMARY KEY,
                semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
                school_id UUID,
                class_id UUID,
                name VARCHAR(100) NOT NULL,
                percentage DECIMAL(5,2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
                requires_surah BOOLEAN DEFAULT false,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_semester_courses_semester_school ON semester_courses(semester_id, school_id)
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_semester_courses_class ON semester_courses(class_id)
        `);
        
        console.log('✅ semester_courses table ready');
        
        // 3. Create grades table if it doesn't exist
        console.log('📋 Checking grades table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS grades (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(10),
                course_id INTEGER REFERENCES semester_courses(id) ON DELETE CASCADE,
                semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
                score DECIMAL(5,2) DEFAULT 0 CHECK (score >= 0 AND score <= 100),
                from_surah INTEGER CHECK (from_surah >= 1 AND from_surah <= 114),
                from_ayah INTEGER CHECK (from_ayah >= 1),
                to_surah INTEGER CHECK (to_surah >= 1 AND to_surah <= 114),
                to_ayah INTEGER CHECK (to_ayah >= 1),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_grades_student_semester ON grades(student_id, semester_id)
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_grades_course_semester ON grades(course_id, semester_id)
        `);
        
        console.log('✅ Grades table ready');
        
        // 4. Add sample semester data if empty
        console.log('📊 Checking for sample semester data...');
        const semesterCount = await client.query('SELECT COUNT(*) FROM semesters');
        
        if (parseInt(semesterCount.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO semesters (type, year, display_name, start_date, end_date) 
                VALUES 
                    ('first', 2025, 'الفصل الأول 2025', '2025-09-01', '2025-01-31'),
                    ('second', 2025, 'الفصل الثاني 2025', '2025-02-01', '2025-06-30'),
                    ('summer', 2025, 'الفصل الصيفي 2025', '2025-07-01', '2025-08-31')
            `);
            console.log('✅ Added sample semester data');
        } else {
            console.log('ℹ️  Semesters table already has data');
        }
        
        // 5. Show final structure
        console.log('\n🔍 Final database structure:');
        
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('grades', 'semesters', 'semester_courses')
            ORDER BY table_name
        `);
        
        console.log('\n📋 Tables created:');
        tables.rows.forEach(table => {
            console.log(`   ✓ ${table.table_name}`);
        });
        
        // Show grades table structure
        const gradesColumns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'grades'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Grades table structure:');
        gradesColumns.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
        
    } catch (error) {
        console.error('❌ Error fixing database:', error.message);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Run if this file is executed directly
if (require.main === module) {
    fixDatabase()
        .then(() => {
            console.log('\n🎉 Database fix completed successfully!');
            console.log('\n💡 You can now:');
            console.log('   - Create and delete semesters');
            console.log('   - Add courses to semesters');
            console.log('   - Grade students');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Database fix failed:', error);
            process.exit(1);
        });
}

module.exports = fixDatabase;