// Usage: node reset-one-password.js <userId> <newPassword>
// Example: node reset-one-password.js 1033922517 "NewPass123!"
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./config/database');
const { BCRYPT_ROUNDS } = require('./config/security');

(async () => {
  const [userId, newPassword] = process.argv.slice(2);
  if (!userId || !newPassword) {
    console.error('Usage: node reset-one-password.js <userId> <newPassword>');
    process.exit(1);
  }
  try {
    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const result = await db.query(
      'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, first_name, last_name, role',
      [hashed, userId]
    );
    if (result.rows.length === 0) {
      console.error(`No user found with id ${userId}`);
      process.exit(1);
    }
    console.log('Password updated for:', result.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
