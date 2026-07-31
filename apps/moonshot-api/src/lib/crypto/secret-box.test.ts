import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptSecret,
  encryptSecret,
  resetPosTokenEncryptionKeyCache,
  resolvePosTokenEncryptionKey,
} from './secret-box.js';

const VALID_KEY_B64 = Buffer.alloc(32, 7).toString('base64');

describe('secret-box', () => {
  afterEach(() => {
    resetPosTokenEncryptionKeyCache();
    delete process.env.POS_TOKEN_ENCRYPTION_KEY;
  });

  it('round-trips a plaintext secret', () => {
    process.env.POS_TOKEN_ENCRYPTION_KEY = VALID_KEY_B64;
    const sealed = encryptSecret('sq0at-access-token-example');
    expect(sealed.startsWith('v1:')).toBe(true);
    expect(decryptSecret(sealed)).toBe('sq0at-access-token-example');
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    process.env.POS_TOKEN_ENCRYPTION_KEY = VALID_KEY_B64;
    const a = encryptSecret('same');
    const b = encryptSecret('same');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('same');
    expect(decryptSecret(b)).toBe('same');
  });

  it('detects tampering of the ciphertext', () => {
    process.env.POS_TOKEN_ENCRYPTION_KEY = VALID_KEY_B64;
    const sealed = encryptSecret('token');
    const parts = sealed.split(':');
    const ct = Buffer.from(parts[3]!, 'base64');
    ct[0] = ct[0]! ^ 0xff;
    parts[3] = ct.toString('base64');
    expect(() => decryptSecret(parts.join(':'))).toThrow();
  });

  it('rejects a missing encryption key', () => {
    expect(() => resolvePosTokenEncryptionKey({})).toThrow(/POS_TOKEN_ENCRYPTION_KEY is required/);
  });

  it('rejects a key of the wrong length', () => {
    expect(() =>
      resolvePosTokenEncryptionKey({
        POS_TOKEN_ENCRYPTION_KEY: Buffer.alloc(16, 1).toString('base64'),
      }),
    ).toThrow(/32 bytes/);
  });

  it('rejects an unsupported version prefix', () => {
    process.env.POS_TOKEN_ENCRYPTION_KEY = VALID_KEY_B64;
    const sealed = encryptSecret('token');
    const bad = sealed.replace(/^v1:/, 'v0:');
    expect(() => decryptSecret(bad)).toThrow(/Unsupported secret-box version/);
  });
});
