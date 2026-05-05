import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** Stored as `scrypt$<saltB64>$<keyB64>` */
const PREFIX = 'scrypt';
const SALT_LEN = 16;
const KEY_LEN = 64;

export function hashKdsPassword(plain: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = scryptSync(plain, salt, KEY_LEN);
  return `${PREFIX}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export function verifyKdsPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== PREFIX) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1]!, 'base64');
    expected = Buffer.from(parts[2]!, 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length !== KEY_LEN) return false;
  const key = scryptSync(plain, salt, KEY_LEN);
  return key.length === expected.length && timingSafeEqual(key, expected);
}
