import { beforeEach, describe, expect, it, vi } from 'vitest';

const expire = vi.hoisted(() => vi.fn());
const getStripeOrNull = vi.hoisted(() => vi.fn());

vi.mock('./stripe-client.js', () => ({
  getStripeOrNull,
  requireStripe: vi.fn(),
}));

import {
  expireStripeCheckoutSession,
  expireStripeCheckoutSessionBestEffort,
} from './stripe-checkout.js';

describe('expireStripeCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    expire.mockResolvedValue({});
    getStripeOrNull.mockReturnValue({
      checkout: { sessions: { expire } },
    });
  });

  it('expires the session on the connected account', async () => {
    await expireStripeCheckoutSession({
      sessionId: 'cs_test_abc',
      connectedAccountId: 'acct_1',
    });

    expect(expire).toHaveBeenCalledWith('cs_test_abc', undefined, { stripeAccount: 'acct_1' });
  });

  it('no-ops when Stripe is not configured', async () => {
    getStripeOrNull.mockReturnValue(null);

    await expireStripeCheckoutSession({
      sessionId: 'cs_test_abc',
      connectedAccountId: 'acct_1',
    });

    expect(expire).not.toHaveBeenCalled();
  });

  it('swallows expire errors in the best-effort wrapper', async () => {
    expire.mockRejectedValue(new Error('session already complete'));

    await expect(
      expireStripeCheckoutSessionBestEffort({
        sessionId: 'cs_test_abc',
        connectedAccountId: 'acct_1',
      })
    ).resolves.toBeUndefined();
  });
});
