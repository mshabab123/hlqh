const db = require('./config/database');

async function checkSchema() {
  try {
    // Check parent_student_relationships table schema
    const schemaQuery = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'parent_student_relationships' 
      ORDER BY ordinal_position
    `);
    
    console.log('parent_student_relationships table columns:');
    if (schemaQuery.rows.length === 0) {
      console.log('  Table does not exist!');
    } else {
      schemaQuery.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
      });
    }
    
    // Check if the table exists at all
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'parent_student_relationships'
      );
    `);
    
    console.log('\nTable exists:', tableExists.rows[0].exists);
    
    // If table exists, check sample data
    if (tableExists.rows[0].exists) {
      const sampleData = await db.query(`
        SELECT * FROM parent_student_relationships LIMIT 5
      `);
      console.log('\nSample data:', sampleData.rows);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

checkSchema();