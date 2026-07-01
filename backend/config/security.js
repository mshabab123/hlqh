// Central security-related configuration and helpers.
// Keep all password hashing consistent across the app.

const crypto = require('crypto');

// bcrypt work factor. Use one value everywhere; raise over time as hardware improves.
const BCRYPT_ROUNDS = 12;

// JWT lifetime. Kept short to limit the window a leaked token is usable.
// Overridable via env so ops can tune without a code change.
const TOKEN_TTL = process.env.TOKEN_TTL || '1d';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // keep session row expiry aligned with TOKEN_TTL default

// Per-account login lockout thresholds.
const LOGIN_MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5;
const LOCKOUT_MINUTES = parseInt(process.env.LOCKOUT_MINUTES, 10) || 15;

/**
 * Generate a random, human-deliverable temporary password.
 * Avoids ambiguous characters (0/O, 1/l/I) so it can be read aloud / written down.
 * @param {number} length
 * @returns {string}
 */
function generateTempPassword(length = 10) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/**
 * Hash a JWT for storage/lookup in the user_sessions table.
 * We never store the raw token, only its SHA-256 digest.
 * @param {string} token
 * @returns {string}
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  BCRYPT_ROUNDS,
  TOKEN_TTL,
  TOKEN_TTL_MS,
  LOGIN_MAX_ATTEMPTS,
  LOCKOUT_MINUTES,
  generateTempPassword,
  hashToken,
};
