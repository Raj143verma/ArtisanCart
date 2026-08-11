import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Default local development fallback key (must be exactly 32 bytes)
const FALLBACK_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';

function getEncryptionKey() {
  const envKey = process.env.KYC_ENCRYPTION_KEY;
  if (envKey) {
    // If key is provided in env, ensure it is exactly 32 bytes/characters
    if (envKey.length !== 32) {
      // pad or truncate for security fallback, but alert in production
      return crypto.createHash('sha256').update(envKey).digest();
    }
    return Buffer.from(envKey, 'utf8');
  }
  return Buffer.from(FALLBACK_KEY, 'utf8');
}

export const encrypt = (text) => {
  if (!text) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard IV length is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  // Concatenate IV and authentication tag to store in a single field
  return {
    encrypted,
    iv: `${iv.toString('hex')}:${tag}`,
  };
};

export const decrypt = (encrypted, ivWithTag) => {
  if (!encrypted || !ivWithTag) return null;
  const key = getEncryptionKey();
  const [ivHex, tagHex] = ivWithTag.split(':');

  if (!ivHex || !tagHex) {
    throw new Error('Invalid initialization vector format.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
