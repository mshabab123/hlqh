const pool = require('./db');

async function makeSemestersSchoolSpecific() {
    let client;
    try {
        console.log('🔧 Making semesters school-specific...');
        
        client = await pool.connect();
        await client.query('BEGIN');
        
        // Check if school_id column already exists
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'semesters' AND column_name = 'school_id'
        `);
        
        if (columnCheck.rows.length === 0) {
            console.log('📋 Adding school_id column to semesters table...');
            
            // Add school_id column
            await client.query(`
                ALTER TABLE semesters 
                ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE CASCADE
            `);
            
            // Drop the old unique constraint
            console.log('📋 Dropping old unique constraint...');
            try {
                await client.query(`
                    ALTER TABLE semesters 
                    DROP CONSTRAINT IF EXISTS semesters_type_year_key
                `);
            } catch (e) {
                console.log('   Old constraint not found, continuing...');
            }
            
            // Add new unique constraint that includes school_id
            console.log('📋 Adding new unique constraint with school_id...');
            await client.query(`
                ALTER TABLE semesters 
                ADD CONSTRAINT semesters_school_type_year_key 
                UNIQUE(school_id, type, year)
            `);
            
            // Add index for better performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_semesters_school_year_type 
                ON semesters(school_id, year, type)
            `);
            
            console.log('✅ Modified semesters table structure');
            
            // Check if there are existing semesters without school_id
            const existingSemesters = await client.query(`
                SELECT COUNT(*) FROM semesters WHERE school_id IS NULL
            `);
            
            if (parseInt(existingSemesters.rows[0].count) > 0) {
                console.log('📊 Found existing semesters without school association...');
                
                // Get all schools
                const schools = await client.query('SELECT id, name FROM schools ORDER BY name');
                
                if (schools.rows.length > 0) {
                    console.log('📋 Associating existing semesters with all schools...');
                    
                    // Get existing semesters
                    const semesters = await client.query(`
                        SELECT id, type, year, display_name, start_date, end_date, is_active
                        FROM semesters WHERE school_id IS NULL
                    `);
                    
                    // Delete the original null semesters (we'll recreate them for each school)
                    await client.query('DELETE FROM semesters WHERE school_id IS NULL');
                    
                    // Create semester for each school
                    for (const school of schools.rows) {
                        for (const semester of semesters.rows) {
                            await client.query(`
                                INSERT INTO semesters (school_id, type, year, display_name, start_date, end_date, is_active, created_at, updated_at)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                            `, [
                                school.id,
                                semester.type,
                                semester.year,
                                semester.display_name,
                                semester.start_date,
                                semester.end_date,
                                semester.is_active
                            ]);
                        }
                        console.log(`   ✓ Created semesters for school: ${school.name}`);
                    }
                } else {
                    console.log('⚠️  No schools found - you may need to create schools first');
                }
            }
            
        } else {
            console.log('✅ Semesters table already has school_id column');
        }
        
        await client.query('COMMIT');
        
        // Show current structure
        console.log('\n🔍 Current semesters table structure:');
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'semesters'
            ORDER BY ordinal_position
        `);
        
        columns.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
        
        // Show sample data
        const sampleData = await client.query(`
            SELECT s.id, s.type, s.year, s.display_name, sc.name as school_name
            FROM semesters s
            LEFT JOIN schools sc ON s.school_id = sc.id
            ORDER BY sc.name, s.year, s.type
            LIMIT 10
        `);
        
        console.log('\n📊 Sample semester data:');
        sampleData.rows.forEach(row => {
            console.log(`   ${row.school_name || 'No School'} - ${row.display_name || `${row.type} ${row.year}`}`);
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error making semesters school-specific:', error.message);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Run if this file is executed directly
if (require.main === module) {
    makeSemestersSchoolSpecific()
        .then(() => {
            console.log('\n🎉 Successfully made semesters school-specific!');
            console.log('\n💡 Next steps:');
            console.log('   - Update frontend to show semesters per school');
            console.log('   - Update semester creation to require school selection');
            console.log('   - Each school now has its own independent semesters');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = makeSemestersSchoolSpecific;