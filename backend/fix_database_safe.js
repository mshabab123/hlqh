const pool = require('./db');

async function fixDatabase() {
    let client;
    try {
        console.log('🔧 Starting database structure fix...');
        
        client = await pool.connect();
        
        // Check what tables exist first
        const existingTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('grades', 'semesters', 'semester_courses')
        `);
        
        console.log('📋 Existing tables:');
        existingTables.rows.forEach(table => {
            console.log(`   ✓ ${table.table_name}`);
        });
        
        // 1. Create semesters table if it doesn't exist
        const semestersExists = existingTables.rows.some(t => t.table_name === 'semesters');
        if (!semestersExists) {
            console.log('📋 Creating semesters table...');
            await client.query(`
                CREATE TABLE semesters (
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
            
            await client.query(`CREATE INDEX idx_semesters_year_type ON semesters(year, type)`);
            console.log('✅ Created semesters table');
        } else {
            console.log('✅ Semesters table already exists');
        }
        
        // 2. Create semester_courses table if it doesn't exist
        const semesterCoursesExists = existingTables.rows.some(t => t.table_name === 'semester_courses');
        if (!semesterCoursesExists) {
            console.log('📋 Creating semester_courses table...');
            await client.query(`
                CREATE TABLE semester_courses (
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
            
            await client.query(`CREATE INDEX idx_semester_courses_semester_school ON semester_courses(semester_id, school_id)`);
            await client.query(`CREATE INDEX idx_semester_courses_class ON semester_courses(class_id)`);
            console.log('✅ Created semester_courses table');
        } else {
            console.log('✅ semester_courses table already exists');
        }
        
        // 3. Handle grades table - check if it exists and what columns it has
        const gradesExists = existingTables.rows.some(t => t.table_name === 'grades');
        
        if (!gradesExists) {
            console.log('📋 Creating grades table...');
            await client.query(`
                CREATE TABLE grades (
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
            
            await client.query(`CREATE INDEX idx_grades_student_semester ON grades(student_id, semester_id)`);
            await client.query(`CREATE INDEX idx_grades_course_semester ON grades(course_id, semester_id)`);
            console.log('✅ Created grades table with all columns');
        } else {
            console.log('📋 Grades table exists, checking columns...');
            
            // Check what columns exist in grades table
            const gradesColumns = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'grades'
            `);
            
            const columnNames = gradesColumns.rows.map(row => row.column_name);
            console.log('   Current columns:', columnNames.join(', '));
            
            // Add missing columns
            if (!columnNames.includes('course_id')) {
                console.log('   Adding course_id column...');
                await client.query(`ALTER TABLE grades ADD COLUMN course_id INTEGER`);
                // Add foreign key constraint separately
                try {
                    await client.query(`ALTER TABLE grades ADD CONSTRAINT fk_grades_course_id 
                                       FOREIGN KEY (course_id) REFERENCES semester_courses(id) ON DELETE CASCADE`);
                } catch (e) {
                    console.log('   Warning: Could not add foreign key constraint for course_id');
                }
            }
            
            if (!columnNames.includes('semester_id')) {
                console.log('   Adding semester_id column...');
                await client.query(`ALTER TABLE grades ADD COLUMN semester_id INTEGER`);
                // Add foreign key constraint separately
                try {
                    await client.query(`ALTER TABLE grades ADD CONSTRAINT fk_grades_semester_id 
                                       FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE`);
                } catch (e) {
                    console.log('   Warning: Could not add foreign key constraint for semester_id');
                }
            }
            
            if (!columnNames.includes('student_id')) {
                console.log('   Adding student_id column...');
                await client.query(`ALTER TABLE grades ADD COLUMN student_id VARCHAR(10)`);
            }
            
            console.log('✅ Grades table columns updated');
        }
        
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
        
        const finalGradesColumns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'grades'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Grades table structure:');
        finalGradesColumns.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
        
    } catch (error) {
        console.error('❌ Error fixing database:', error.message);
        console.error('Full error:', error);
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