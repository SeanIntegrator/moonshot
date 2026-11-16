import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getStripeOrNull,
  claimStripeWebhookForProcessing,
  completeStripeWebhookProcessing,
  failStripeWebhookProcessing,
} = vi.hoisted(() => ({
  getStripeOrNull: vi.fn(),
  claimStripeWebhookForProcessing: vi.fn(),
  completeStripeWebhookProcessing: vi.fn(),
  failStripeWebhookProcessing: vi.fn(),
}));

vi.mock('../db.js', () => ({ pool: {} }));

vi.mock('../lib/config.js', () => ({
  config: { stripeWebhookSecret: 'whsec_test' },
}));

vi.mock('../lib/payments/stripe-client.js', () => ({
  getStripeOrNull,
}));

vi.mock('../lib/payments/repository.js', () => ({
  claimStripeWebhookForProcessing,
  completeStripeWebhookProcessing,
  failStripeWebhookProcessing,
  updateCafePaymentConfig: vi.fn(),
}));

vi.mock('../lib/cafes-repository.js', () => ({
  findCafeById: vi.fn(),
  findCafesByStripeAccountId: vi.fn(),
}));

vi.mock('../lib/orders/order-checkout.js', () => ({
  confirmOrderPaidFromStripeCheckout: vi.fn(),
}));

vi.mock('../lib/orders/order-lifecycle-notify.js', () => ({
  notifyOrderReadyForKitchen: vi.fn(),
}));

import { handleStripeWebhook } from './webhooks-stripe.js';

function mockRes(): Response {
  const res = {
    statusCode: 200,
    status: vi.fn(function (this: Response, code: number) {
      (this as { statusCode: number }).statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: Response, body: unknown) {
      (this as { body: unknown }).body = body;
      return this;
    }),
    send: vi.fn(function (this: Response, body: unknown) {
      (this as { body: unknown }).body = body;
      return this;
    }),
  } as unknown as Response & { statusCode: number; body: unknown };
  return res;
}

describe('handleStripeWebhook skip_inflight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStripeOrNull.mockReturnValue({
      webhooks: {
        constructEvent: () => ({
          id: 'evt_inflight',
          type: 'checkout.session.completed',
          data: { object: {} },
        }),
      },
    });
  });

  it('returns 503 so Stripe retries instead of ACKing a still-running delivery', async () => {
    claimStripeWebhookForProcessing.mockResolvedValueOnce({ kind: 'skip_inflight' });

    const req = {
      body: Buffer.from('{}'),
      headers: { 'stripe-signature': 'sig' },
    } as unknown as Request;
    const res = mockRes();

    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ received: false, retry: true });
    expect(completeStripeWebhookProcessing).not.toHaveBeenCalled();
    expect(failStripeWebhookProcessing).not.toHaveBeenCalled();
  });
});
