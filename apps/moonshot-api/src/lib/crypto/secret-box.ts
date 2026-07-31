import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

/**
 * Resolve the AES-256 key from `POS_TOKEN_ENCRYPTION_KEY` (base64, 32 bytes).
 * Cached after first successful resolve. Throws if missing or wrong length.
 */
export function resolvePosTokenEncryptionKey(env = process.env): Buffer {
  if (cachedKey) return cachedKey;

  const raw = env.POS_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error('POS_TOKEN_ENCRYPTION_KEY is required (base64-encoded 32-byte key)');
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    throw new Error('POS_TOKEN_ENCRYPTION_KEY must be valid base64');
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `POS_TOKEN_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length})`,
    );
  }

  cachedKey = key;
  return key;
}

/** Clear the cached key — for tests only. */
export function resetPosTokenEncryptionKeyCache(): void {
  cachedKey = null;
}

/**
 * Encrypt a UTF-8 secret. Format: `v1:<ivB64>:<tagB64>:<ciphertextB64>`.
 * Version prefix leaves room for key rotation without rewriting callers.
 */
export function encryptSecret(plain: string, key = resolvePosTokenEncryptionKey()): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a `v1:…` payload produced by {@link encryptSecret}.
 * Throws on tamper, wrong key, or unsupported version.
 */
export function decryptSecret(sealed: string, key = resolvePosTokenEncryptionKey()): string {
  const parts = sealed.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid sealed secret format');
  }
  const [version, ivB64, tagB64, ciphertextB64] = parts;
  if (version !== VERSION) {
    throw new Error(`Unsupported secret-box version: ${version}`);
  }
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Invalid sealed secret format');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length');
  }
  if (tag.length !== TAG_LENGTH) {
    throw new Error('Invalid auth tag length');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
