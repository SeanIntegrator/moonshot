import { describe, expect, it } from 'vitest';
import { SquareError } from 'square';
import {
  POS_CONNECTIONS_PROVIDER_MERCHANT_UNIQUE,
  merchantInUseRedirectExtras,
  squareConnectReturnFailureReason,
  squareConnectReturnLogFields,
} from './oauth-return-errors.js';

describe('squareConnectReturnFailureReason', () => {
  it('maps unique merchant collisions', () => {
    const err = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: POS_CONNECTIONS_PROVIDER_MERCHANT_UNIQUE,
    });
    expect(squareConnectReturnFailureReason(err)).toBe('merchant_in_use');
  });

  it('maps unique merchant collisions from the message when constraint is missing', () => {
    const err = Object.assign(
      new Error(`duplicate key value violates unique constraint "${POS_CONNECTIONS_PROVIDER_MERCHANT_UNIQUE}"`),
      { code: '23505' },
    );
    expect(squareConnectReturnFailureReason(err)).toBe('merchant_in_use');
  });

  it('keeps other unique violations generic', () => {
    const err = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'pos_connections_cafe_provider_unique',
    });
    expect(squareConnectReturnFailureReason(err)).toBe('exchange_failed');
  });

  it('keeps Square API errors generic', () => {
    const err = new SquareError({
      message: 'unauthorized',
      statusCode: 401,
      body: { errors: [{ category: 'AUTHENTICATION_ERROR', code: 'UNAUTHORIZED' }] },
    });
    expect(squareConnectReturnFailureReason(err)).toBe('exchange_failed');
  });
});

describe('merchantInUseRedirectExtras', () => {
  it('includes a trimmed café name', () => {
    expect(merchantInUseRedirectExtras({ name: '  quirky  ', slug: 'quirky' })).toEqual({
      reason: 'merchant_in_use',
      otherCafe: 'quirky',
    });
  });

  it('falls back to slug when name is empty', () => {
    expect(merchantInUseRedirectExtras({ name: '  ', slug: 'loadstar' })).toEqual({
      reason: 'merchant_in_use',
      otherCafe: 'loadstar',
    });
  });
});

describe('squareConnectReturnLogFields', () => {
  it('includes Square status and error codes without extra body dump', () => {
    const err = new SquareError({
      message: 'unauthorized',
      statusCode: 401,
      body: {
        errors: [
          {
            category: 'AUTHENTICATION_ERROR',
            code: 'UNAUTHORIZED',
            detail: 'Authorization code not found',
          },
        ],
      },
    });
    const fields = squareConnectReturnLogFields(err);
    expect(fields.statusCode).toBe(401);
    expect(fields.squareErrors).toEqual([
      {
        category: 'AUTHENTICATION_ERROR',
        code: 'UNAUTHORIZED',
        detail: 'Authorization code not found',
      },
    ]);
  });
});
