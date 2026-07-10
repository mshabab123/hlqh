const db = require('../config/database');
const { generateEmailToken, hashEmailToken, sendVerificationEmail } = require('./email');

// Create a fresh verification token for a user and email it. Best-effort:
// returns the send result; never throws (so registration can't fail on email).
async function issueVerification(user, client = db) {
  try {
    if (!user?.email) return { sent: false, reason: 'no_email' };
    const { token, tokenHash } = generateEmailToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    // Invalidate previous unused tokens for this user, then insert the new one.
    await client.query(
      'UPDATE email_verification_tokens SET used = true WHERE user_id = $1 AND used = false',
      [user.id]
    );
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );
    return await sendVerificationEmail(user, token);
  } catch (error) {
    console.error('issueVerification error:', error.message);
    return { sent: false, reason: 'error', error: error.message };
  }
}

// Consume a verification token: marks the user verified. Returns a result object.
async function consumeVerification(token) {
  const tokenHash = hashEmailToken(token);
  const result = await db.query(
    `SELECT id, user_id FROM email_verification_tokens
     WHERE token_hash = $1 AND used = false AND expires_at > NOW()`,
    [tokenHash]
  );
  if (result.rows.length === 0) return { ok: false };

  const { id, user_id } = result.rows[0];
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET email_verified = true WHERE id = $1', [user_id]);
    await client.query('UPDATE email_verification_tokens SET used = true WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  return { ok: true, userId: user_id };
}

module.exports = { issueVerification, consumeVerification };
