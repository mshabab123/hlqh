// check-homework.js - Check homework records
const pool = require('./config/database');
require('dotenv').config();

async function checkHomework() {
  try {
    console.log('📋 Checking homework records...\n');

    const result = await pool.query(`
      SELECT
        h.*,
        c.name as class_name,
        CONCAT(u.first_name, ' ', u.last_name) as student_name
      FROM homework h
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN users u ON h.student_id = u.id
      ORDER BY h.created_at DESC
      LIMIT 10;
    `);

    if (result.rows.length === 0) {
      console.log('⚠️  No homework records found.');
    } else {
      console.log(`✅ Found ${result.rows.length} homework record(s):\n`);
      result.rows.forEach((hw, index) => {
        console.log(`${index + 1}. ID: ${hw.id}`);
        console.log(`   Title: ${hw.title}`);
        console.log(`   Student: ${hw.student_name || 'N/A'}`);
        console.log(`   Class: ${hw.class_name || 'N/A'}`);
        console.log(`   Range: Surah ${hw.start_surah}:${hw.start_ayah} - ${hw.end_surah}:${hw.end_ayah}`);
        console.log(`   Status: ${hw.status}`);
        console.log(`   Assigned: ${hw.assigned_date}`);
        console.log(`   Due: ${hw.due_date || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkHomework();
