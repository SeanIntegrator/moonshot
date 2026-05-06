import { describe, expect, it } from 'vitest';
import {
  parseAllowedOrigins,
  resolveCorsOriginDecision,
} from './cors-origins.js';

describe('parseAllowedOrigins', () => {
  it('splits and trims origins', () => {
    expect(parseAllowedOrigins('https://a.example, https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('returns empty array for unset string', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins('')).toEqual([]);
  });
});

describe('resolveCorsOriginDecision', () => {
  const list = ['https://moonshot-order-ahead-production.up.railway.app'];

  it('allows requests with no Origin', () => {
    expect(resolveCorsOriginDecision(undefined, [], { isProduction: false })).toBe(true);
    expect(resolveCorsOriginDecision(undefined, list, { isProduction: true })).toBe(true);
  });

  it('production: allow only listed origins (+ localhost when not prod)', () => {
    expect(
      resolveCorsOriginDecision(
        'https://moonshot-order-ahead-production.up.railway.app',
        list,
        { isProduction: true },
      ),
    ).toBe(true);
    expect(
      resolveCorsOriginDecision('https://evil.example', list, { isProduction: true }),
    ).toBe(false);
  });

  it('production: empty env list denies browser origins', () => {
    expect(
      resolveCorsOriginDecision('https://any.example.com', [], { isProduction: true }),
    ).toBe(false);
  });

  it('development: empty env list permits any origin', () => {
    expect(
      resolveCorsOriginDecision('https://any.example.com', [], { isProduction: false }),
    ).toBe(true);
  });
});
