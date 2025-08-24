const pool = require('./db');

async function setupStudentClassesTable() {
    let client;
    try {
        console.log('🔧 Setting up student_classes table...');
        
        client = await pool.connect();
        
        // Check if student_classes table exists
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'student_classes'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('📋 Creating student_classes table...');
            
            // Create the student_classes table
            await client.query(`
                CREATE TABLE student_classes (
                    id SERIAL PRIMARY KEY,
                    student_id VARCHAR(10) REFERENCES students(id) ON DELETE CASCADE,
                    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
                    enrollment_date TIMESTAMP DEFAULT NOW(),
                    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(student_id, class_id)
                )
            `);
            
            // Create indexes for better performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_student_classes_student ON student_classes(student_id)
            `);
            
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_student_classes_class ON student_classes(class_id)
            `);
            
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_student_classes_status ON student_classes(status)
            `);
            
            console.log('✅ Created student_classes table with indexes');
        } else {
            console.log('✅ student_classes table already exists');
        }
        
        // Check if we need to migrate from student_enrollments
        const enrollmentsExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'student_enrollments'
            );
        `);
        
        if (enrollmentsExists.rows[0].exists) {
            console.log('📋 Migrating data from student_enrollments...');
            
            // Check what columns exist in student_enrollments
            const enrollmentColumns = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'student_enrollments'
            `);
            
            const hasCreatedAt = enrollmentColumns.rows.some(row => row.column_name === 'created_at');
            const dateColumn = hasCreatedAt ? 'created_at' : 'NOW()';
            
            await client.query(`
                INSERT INTO student_classes (student_id, class_id, enrollment_date, status)
                SELECT 
                    student_id, 
                    class_id, 
                    ${dateColumn}, 
                    CASE 
                        WHEN status = 'enrolled' THEN 'active'
                        WHEN status = 'inactive' THEN 'inactive'
                        ELSE 'active'
                    END
                FROM student_enrollments
                ON CONFLICT (student_id, class_id) DO NOTHING
            `);
            
            console.log('✅ Migrated data from student_enrollments');
        }
        
        // Show current structure
        const structure = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'student_classes'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 student_classes table structure:');
        structure.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
        
        // Show sample count
        const count = await client.query('SELECT COUNT(*) as count FROM student_classes');
        console.log(`\n📈 Current records: ${count.rows[0].count} student-class enrollments`);
        
    } catch (error) {
        console.error('❌ Error setting up student_classes table:', error.message);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Run if this file is executed directly
if (require.main === module) {
    setupStudentClassesTable()
        .then(() => {
            console.log('\n🎉 Student-Classes table setup completed!');
            console.log('\n💡 You can now:');
            console.log('   - Add students to classes');
            console.log('   - View class rosters');
            console.log('   - Remove students from classes');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Setup failed:', error);
            process.exit(1);
        });
}

module.exports = setupStudentClassesTable;