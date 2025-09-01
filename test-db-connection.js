const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'your_database',
      port: process.env.DB_PORT || 3306,
    });

    console.log('✅ Database connection established successfully!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    console.log('📊 Test query result:', rows[0]);
    
    // Show database info
    const [dbInfo] = await connection.execute('SELECT DATABASE() as current_db, VERSION() as version');
    console.log('📋 Database info:', dbInfo[0]);
    
    // Show tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📂 Available tables:', tables.map(table => Object.values(table)[0]));
    
    await connection.end();
    console.log('🔒 Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.sqlMessage || error.toString());
    
    // Common error solutions
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Solution: Check if MySQL server is running');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Solution: Check username/password credentials');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Solution: Check if database name exists');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Solution: Check host address');
    }
  }
}

// Show current environment variables
console.log('🔧 Current database configuration:');
console.log('Host:', process.env.DB_HOST || 'localhost');
console.log('User:', process.env.DB_USER || 'root');
console.log('Database:', process.env.DB_NAME || 'your_database');
console.log('Port:', process.env.DB_PORT || 3306);
console.log('Password:', process.env.DB_PASSWORD ? '***hidden***' : 'not set');
console.log('---');

testDatabaseConnection();