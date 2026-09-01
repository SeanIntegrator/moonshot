import { describe, expect, it, vi } from 'vitest';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../http-errors.js';
import {
  mapStripeOnboardingError,
  STRIPE_CONNECT_SETUP_FAILED_MESSAGE,
  STRIPE_CONNECT_UNAVAILABLE_MESSAGE,
} from './stripe-connect-errors.js';

describe('mapStripeOnboardingError', () => {
  it('passes through ApiHttpError', () => {
    const err = new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
    expect(mapStripeOnboardingError(err)).toBe(err);
  });

  it('maps Connect platform-profile failures to a café-safe 503', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error(
      'Please review the responsibilities of managing losses for connected accounts at https://dashboard.stripe.com/settings/connect/platform-profile.',
    );
    const mapped = mapStripeOnboardingError(err);
    spy.mockRestore();
    expect(mapped.status).toBe(503);
    expect(mapped.code).toBe(ApiErrorCode.CONFIG);
    expect(mapped.message).toBe(STRIPE_CONNECT_UNAVAILABLE_MESSAGE);
    expect(mapped.message).not.toMatch(/dashboard\.stripe\.com/i);
  });

  it('maps other Stripe failures without leaking internals', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mapped = mapStripeOnboardingError(new Error('No such account: acct_123'));
    spy.mockRestore();
    expect(mapped.status).toBe(502);
    expect(mapped.message).toBe(STRIPE_CONNECT_SETUP_FAILED_MESSAGE);
    expect(mapped.message).not.toContain('acct_123');
  });
});
