const crypto = require('crypto');

const PREFIX = 'enc:v1:';
const secret = process.env.MESSAGE_ENCRYPTION_KEY || process.env.JWT_SECRET;
const key = crypto.createHash('sha256').update(`internal-messages:${secret}`).digest();

function encryptMessageBody(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptMessageBody(value) {
  if (!String(value || '').startsWith(PREFIX)) return value;
  try {
    const [ivValue, tagValue, encryptedValue] = String(value).slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64')),
      decipher.final()
    ]).toString('utf8');
  } catch (error) {
    return '[تعذر فك تشفير الرسالة]';
  }
}

module.exports = { encryptMessageBody, decryptMessageBody, PREFIX };
