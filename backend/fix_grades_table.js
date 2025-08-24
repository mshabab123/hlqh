const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function fixGradesTable() {
    let client;
    try {
        console.log('🔧 Starting grades table structure fix...');
        
        client = await pool.connect();
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'fix_grades_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Execute the SQL
        await client.query(sql);
        
        console.log('✅ Grades table structure fix completed successfully');
        
        // Verify the structure and show all relevant tables
        console.log('\n🔍 Checking database structure...');
        
        // Check what tables exist
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('grades', 'semesters', 'semester_courses', 'students', 'classes')
            ORDER BY table_name
        `);
        
        console.log('\n📋 Existing tables:');
        tables.rows.forEach(table => {
            console.log(`   ✓ ${table.table_name}`);
        });
        
        // Check grades table structure if it exists
        const gradesExists = tables.rows.some(t => t.table_name === 'grades');
        if (gradesExists) {
            const gradesColumns = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'grades'
                ORDER BY ordinal_position
            `);
            
            console.log('\n📊 Current grades table structure:');
            gradesColumns.rows.forEach(col => {
                console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
            });
        }
        
        // Check semester_courses table structure
        const semesterCoursesExists = tables.rows.some(t => t.table_name === 'semester_courses');
        if (semesterCoursesExists) {
            const semesterCoursesColumns = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'semester_courses'
                ORDER BY ordinal_position
            `);
            
            console.log('\n📊 Current semester_courses table structure:');
            semesterCoursesColumns.rows.forEach(col => {
                console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
            });
        }
        
        // Check semesters table structure
        const semestersExists = tables.rows.some(t => t.table_name === 'semesters');
        if (semestersExists) {
            const semestersColumns = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'semesters'
                ORDER BY ordinal_position
            `);
            
            console.log('\n📊 Current semesters table structure:');
            semestersColumns.rows.forEach(col => {
                console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
            });
        } else {
            console.log('\n❌ semesters table does not exist!');
        }
        
    } catch (error) {
        console.error('❌ Error fixing grades table:', error.message);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Run if this file is executed directly
if (require.main === module) {
    fixGradesTable()
        .then(() => {
            console.log('\n🎉 Fix completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Fix failed:', error);
            process.exit(1);
        });
}

module.exports = fixGradesTable;