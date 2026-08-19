import { describe, expect, it } from 'vitest';
import type { AdminStripeAccountStatusResponse } from '@moonshot/types';
import { isStripeServerUnavailable, stripeRowView } from './stripe-connection.js';

const live: AdminStripeAccountStatusResponse = {
  configured: true,
  accountId: 'acct_1',
  chargesEnabled: true,
  detailsSubmitted: true,
  payoutsEnabled: true,
};

describe('stripeRowView', () => {
  it('is live when charges are enabled', () => {
    const row = stripeRowView(live);
    expect(row.tone).toBe('healthy');
    expect(row.actionKind).toBe('dashboard');
    expect(row.needsAttention).toBe(false);
  });

  it('is unfinished when the account cannot charge', () => {
    const row = stripeRowView({ ...live, chargesEnabled: false });
    expect(row.tone).toBe('stale');
    expect(row.actionKind).toBe('onboard');
    expect(row.needsAttention).toBe(true);
  });

  it('does not look live when Stripe is not configured on the API', () => {
    const row = stripeRowView({ ...live, configured: false, chargesEnabled: true });
    expect(row.needsAttention).toBe(true);
    expect(row.actionKind).toBe('onboard');
  });

  it('detects unconfigured Stripe from API error text', () => {
    expect(isStripeServerUnavailable('STRIPE_SECRET_KEY is not configured')).toBe(true);
    expect(isStripeServerUnavailable('network timeout')).toBe(false);
  });
});
