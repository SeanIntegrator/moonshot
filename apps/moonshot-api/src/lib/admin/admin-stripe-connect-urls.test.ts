import { afterEach, describe, expect, it } from 'vitest';
import {
  adminRedirectWithStripeQuery,
  buildStripeConnectCallbackUrl,
  signStripeConnectState,
  verifyStripeConnectState,
} from './admin-stripe-connect-urls.js';

describe('admin-stripe-connect-urls', () => {
  const prevJwt = process.env.JWT_SECRET;
  const prevRedirect = process.env.STRIPE_CONNECT_ADMIN_REDIRECT_URL;

  afterEach(() => {
    if (prevJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwt;
    if (prevRedirect === undefined) delete process.env.STRIPE_CONNECT_ADMIN_REDIRECT_URL;
    else process.env.STRIPE_CONNECT_ADMIN_REDIRECT_URL = prevRedirect;
  });

  it('round-trips café id in signed state', () => {
    process.env.JWT_SECRET = 'test-secret';
    const state = signStripeConnectState('cafe-uuid-1');
    expect(verifyStripeConnectState(state)).toBe('cafe-uuid-1');
    expect(verifyStripeConnectState('not-a-jwt')).toBeNull();
  });

  it('appends state to callback base URL', () => {
    process.env.JWT_SECRET = 'test-secret';
    const url = buildStripeConnectCallbackUrl(
      'https://api.example.com/api/v1/admin/payments/stripe/return',
      'cafe-uuid-1',
    );
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://api.example.com');
    expect(parsed.pathname).toBe('/api/v1/admin/payments/stripe/return');
    expect(verifyStripeConnectState(parsed.searchParams.get('state') ?? '')).toBe('cafe-uuid-1');
  });

  it('normalises origin-only admin redirect to /onboarding', () => {
    process.env.STRIPE_CONNECT_ADMIN_REDIRECT_URL = 'https://moonshotadmin-production.up.railway.app';
    const url = new URL(adminRedirectWithStripeQuery('return'));
    expect(url.pathname).toBe('/onboarding');
    expect(url.searchParams.get('stripeConnect')).toBe('return');
  });
});
