require('dotenv').config(); // load .env variables
const { Client } = require('pg');

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Database connected successfully!");

    const res = await client.query('SELECT NOW()');
    console.log("Database time:", res.rows[0]);

    const users = await client.query('SELECT * FROM users');
    console.log("All users:", users.rows);

  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  } finally {
    await client.end();
  }
}

testConnection();
