const { Pool } = require('pg');
require('dotenv').config();

async function testPostgresConnection() {
  console.log('🔍 Testing PostgreSQL connection...');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'your_database',
    port: process.env.DB_PORT || 5432,
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection established successfully!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('📊 Test query result:', result.rows[0]);
    
    // Show tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📂 Available tables:', tables.rows.map(row => row.table_name));
    
    client.release();
    console.log('🔒 Connection closed successfully');
    
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Solution: Check if PostgreSQL server is running');
    } else if (error.code === '28P01') {
      console.log('💡 Solution: Check username/password credentials');
    } else if (error.code === '3D000') {
      console.log('💡 Solution: Check if database name exists');
    }
  } finally {
    await pool.end();
  }
}

console.log('🔧 Current PostgreSQL configuration:');
console.log('Host:', process.env.DB_HOST || 'localhost');
console.log('User:', process.env.DB_USER || 'postgres');
console.log('Database:', process.env.DB_NAME || 'your_database');
console.log('Port:', process.env.DB_PORT || 5432);
console.log('Password:', process.env.DB_PASSWORD ? '***hidden***' : 'not set');
console.log('---');

testPostgresConnection();