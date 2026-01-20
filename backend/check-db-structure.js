// check-db-structure.js - Check database structure
const pool = require('./config/database');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('📋 Checking database structure...\n');

    // Check if homework table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'homework'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Homework table does NOT exist in the database.');
      console.log('   You need to run the migration: fix-homework-types.sql\n');
      return;
    }

    console.log('✅ Homework table exists!\n');

    // Get table structure
    const structure = await pool.query(`
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'homework'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Homework table structure:');
    console.log('─'.repeat(80));
    structure.rows.forEach(col => {
      const type = col.character_maximum_length
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;
      console.log(`  ${col.column_name.padEnd(25)} ${type.padEnd(30)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('─'.repeat(80) + '\n');

    // Count homework records
    const count = await pool.query('SELECT COUNT(*) FROM homework');
    console.log(`📈 Total homework records: ${count.rows[0].count}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
