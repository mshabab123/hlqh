// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  client_encoding: 'UTF8',
  // Enable TLS for remote databases. Set DB_SSL=true in production so
  // credentials and data are not sent over the wire in cleartext.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false
});

module.exports = pool;