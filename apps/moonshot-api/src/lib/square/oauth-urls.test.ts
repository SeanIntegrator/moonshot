import { afterEach, describe, expect, it } from 'vitest';
import {
  adminRedirectWithSquareQuery,
  buildSquareAuthorizeUrl,
  signSquareConnectState,
  verifySquareConnectState,
} from './oauth-urls.js';

describe('square oauth-urls', () => {
  const prev: Record<string, string | undefined> = {};

  function stash(keys: string[]) {
    for (const k of keys) prev[k] = process.env[k];
  }

  function restore() {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  afterEach(() => {
    restore();
  });

  it('round-trips café id and nonce in signed state', () => {
    stash(['JWT_SECRET']);
    process.env.JWT_SECRET = 'test-secret';
    const state = signSquareConnectState('cafe-uuid-1');
    const claims = verifySquareConnectState(state);
    expect(claims?.cafeId).toBe('cafe-uuid-1');
    expect(claims?.nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(verifySquareConnectState('not-a-jwt')).toBeNull();
  });

  it('rejects wrong purpose tokens', () => {
    stash(['JWT_SECRET']);
    process.env.JWT_SECRET = 'test-secret';
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
    const bad = jwt.sign(
      { cafeId: 'cafe-1', nonce: 'abc', purpose: 'stripe_connect_state' },
      'test-secret',
      { expiresIn: '15m' },
    );
    expect(verifySquareConnectState(bad)).toBeNull();
  });

  it('builds sandbox authorize URL with scopes and state', () => {
    stash([
      'JWT_SECRET',
      'SQUARE_APPLICATION_ID',
      'SQUARE_ENVIRONMENT',
      'SQUARE_OAUTH_REDIRECT_URL',
    ]);
    process.env.JWT_SECRET = 'test-secret';
    process.env.SQUARE_APPLICATION_ID = 'sq0idp-test';
    process.env.SQUARE_ENVIRONMENT = 'sandbox';
    process.env.SQUARE_OAUTH_REDIRECT_URL =
      'http://localhost:3000/api/v1/admin/connect/square/return';

    const { url, state } = buildSquareAuthorizeUrl('cafe-uuid-1');
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://connect.squareupsandbox.com');
    expect(parsed.pathname).toBe('/oauth2/authorize');
    expect(parsed.searchParams.get('client_id')).toBe('sq0idp-test');
    expect(parsed.searchParams.get('scope')).toContain('ITEMS_READ');
    expect(parsed.searchParams.get('redirect_uri')).toContain('/connect/square/return');
    expect(verifySquareConnectState(parsed.searchParams.get('state') ?? '')?.cafeId).toBe(
      'cafe-uuid-1',
    );
    expect(verifySquareConnectState(state)?.cafeId).toBe('cafe-uuid-1');
  });

  it('normalises origin-only admin redirect to /onboarding/import-pos', () => {
    stash(['SQUARE_CONNECT_ADMIN_REDIRECT_URL']);
    process.env.SQUARE_CONNECT_ADMIN_REDIRECT_URL = 'https://admin.example.com';
    const url = new URL(adminRedirectWithSquareQuery('connected'));
    expect(url.pathname).toBe('/onboarding/import-pos');
    expect(url.searchParams.get('squareConnect')).toBe('connected');
  });
});
