const { Pool } = require('pg');

// Database configuration - using postgres user to change ownership
const pool = new Pool({
  user: 'postgres', // Must use postgres user to change ownership
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hlaqh',
  password: process.env.DB_PASSWORD || 'your_postgres_password', // Use postgres password
  port: process.env.DB_PORT || 5432,
});

async function changeOwnership() {
  console.log('🔄 Changing database object ownership...');
  
  const client = await pool.connect();
  
  try {
    const newOwner = 'mshababalrizahs';
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    
    console.log(`📋 Found ${tablesResult.rows.length} tables to change ownership:`);
    
    // Change ownership of all tables
    for (const row of tablesResult.rows) {
      const tableName = row.tablename;
      console.log(`   ➕ Changing ownership of table: ${tableName}`);
      
      await client.query(`ALTER TABLE ${tableName} OWNER TO ${newOwner};`);
    }
    
    // Get all sequences
    const sequencesResult = await client.query(`
      SELECT sequencename 
      FROM pg_sequences 
      WHERE schemaname = 'public';
    `);
    
    console.log(`📋 Found ${sequencesResult.rows.length} sequences to change ownership:`);
    
    // Change ownership of all sequences
    for (const row of sequencesResult.rows) {
      const sequenceName = row.sequencename;
      console.log(`   ➕ Changing ownership of sequence: ${sequenceName}`);
      
      await client.query(`ALTER SEQUENCE ${sequenceName} OWNER TO ${newOwner};`);
    }
    
    // Get all views
    const viewsResult = await client.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public';
    `);
    
    console.log(`📋 Found ${viewsResult.rows.length} views to change ownership:`);
    
    // Change ownership of all views
    for (const row of viewsResult.rows) {
      const viewName = row.viewname;
      console.log(`   ➕ Changing ownership of view: ${viewName}`);
      
      await client.query(`ALTER VIEW ${viewName} OWNER TO ${newOwner};`);
    }
    
    // Get all functions
    const functionsResult = await client.query(`
      SELECT proname, pronamespace::regnamespace as schema
      FROM pg_proc 
      WHERE pronamespace = 'public'::regnamespace;
    `);
    
    console.log(`📋 Found ${functionsResult.rows.length} functions to change ownership:`);
    
    // Change ownership of all functions
    for (const row of functionsResult.rows) {
      const functionName = row.proname;
      console.log(`   ➕ Changing ownership of function: ${functionName}`);
      
      await client.query(`ALTER FUNCTION ${functionName} OWNER TO ${newOwner};`);
    }
    
    // Change database ownership
    console.log(`   ➕ Changing ownership of database: hlaqh`);
    await client.query(`ALTER DATABASE hlaqh OWNER TO ${newOwner};`);
    
    console.log('\n🎉 Ownership change completed successfully!');
    console.log(`✅ All database objects are now owned by: ${newOwner}`);
    
    // Verify ownership
    const verifyResult = await client.query(`
      SELECT 
        'table' as object_type,
        tablename as object_name,
        tableowner as owner
      FROM pg_tables 
      WHERE schemaname = 'public'
      UNION ALL
      SELECT 
        'view' as object_type,
        viewname as object_name,
        viewowner as owner
      FROM pg_views 
      WHERE schemaname = 'public'
      ORDER BY object_type, object_name;
    `);
    
    console.log('\n📊 Ownership Verification:');
    verifyResult.rows.forEach(row => {
      console.log(`   ${row.object_type}: ${row.object_name} → ${row.owner}`);
    });
    
  } catch (error) {
    console.error('❌ Ownership change failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    await changeOwnership();
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
    console.log('👍 You can now run the database update script with your user!');
    process.exit(0);
  }
}

// Handle script execution
if (require.main === module) {
  console.log('🚀 Database Ownership Change Script');
  console.log('===================================');
  main();
}

module.exports = { changeOwnership };