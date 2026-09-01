import { describe, expect, it } from 'vitest';
import { SquareError } from 'square';
import { isPermanentSquareAuthFailure } from './auth-errors.js';

describe('isPermanentSquareAuthFailure', () => {
  it('detects 401 status codes', () => {
    expect(isPermanentSquareAuthFailure(Object.assign(new Error('nope'), { statusCode: 401 }))).toBe(
      true,
    );
  });

  it('detects SquareError with ACCESS_TOKEN_EXPIRED code', () => {
    const err = new SquareError({
      message: 'expired',
      statusCode: 401,
      body: { errors: [{ code: 'ACCESS_TOKEN_EXPIRED' }] },
    });
    expect(isPermanentSquareAuthFailure(err)).toBe(true);
  });

  it('detects message patterns', () => {
    expect(isPermanentSquareAuthFailure(new Error('access_token_revoked'))).toBe(true);
    expect(isPermanentSquareAuthFailure(new Error('invalid_grant'))).toBe(true);
  });

  it('ignores transient failures', () => {
    expect(isPermanentSquareAuthFailure(new Error('network timeout'))).toBe(false);
    expect(isPermanentSquareAuthFailure(Object.assign(new Error('rate limited'), { statusCode: 429 }))).toBe(
      false,
    );
  });
});
