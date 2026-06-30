import type { NormalisedOrder } from '@moonshot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOrderByStripeCheckoutSessionForCafe = vi.hoisted(() => vi.fn());
const findCafeById = vi.hoisted(() => vi.fn());
const getStripeConnectAccountId = vi.hoisted(() => vi.fn());
const getStripeOrNull = vi.hoisted(() => vi.fn());
const retrieveStripeCheckoutSession = vi.hoisted(() => vi.fn());
const confirmOrderPaidFromStripeCheckout = vi.hoisted(() => vi.fn());
const emitKdsServerToClient = vi.hoisted(() => vi.fn());
const recomputePickupEtasForCafe = vi.hoisted(() => vi.fn());

vi.mock('./order-checkout.js', () => ({
  findOrderByStripeCheckoutSessionForCafe,
  confirmOrderPaidFromStripeCheckout,
}));

vi.mock('../cafes-repository.js', () => ({
  findCafeById,
}));

vi.mock('../payments/cafe-payment-config.js', () => ({
  getStripeConnectAccountId,
}));

vi.mock('../payments/stripe-client.js', () => ({
  getStripeOrNull: getStripeOrNull,
}));

vi.mock('../payments/stripe-checkout.js', () => ({
  retrieveStripeCheckoutSession,
}));

vi.mock('../../realtime/kds-events.js', () => ({
  emitKdsServerToClient,
}));

vi.mock('../pickup-eta.js', () => ({
  recomputePickupEtasForCafe,
}));

import { recoverOrderFromStripeCheckoutSession } from './checkout-session-recovery.js';

function mockPendingOrder(overrides: Partial<NormalisedOrder> = {}): NormalisedOrder {
  return {
    id: 'order-1',
    cafeId: 'cafe-1',
    customerId: 'user-1',
    customerName: 'Patron',
    totalMinor: 500,
    currency: 'GBP',
    orderType: 'takeaway',
    source: 'app',
    status: 'pending',
    paymentStatus: 'unpaid',
    items: [],
    pickup: { pickupTime: null, completedAt: null },
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as NormalisedOrder;
}

describe('recoverOrderFromStripeCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStripeOrNull.mockReturnValue({});
    getStripeConnectAccountId.mockReturnValue('acct_test');
    findCafeById.mockResolvedValue({
      id: 'cafe-1',
      paymentConfig: {},
      kdsConfig: {},
    });
  });

  it('returns null when no order matches session', async () => {
    findOrderByStripeCheckoutSessionForCafe.mockResolvedValue(null);

    const result = await recoverOrderFromStripeCheckoutSession({
      sessionId: 'cs_test_abc',
      cafeId: 'cafe-1',
    });

    expect(result).toBeNull();
    expect(retrieveStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it('returns paid order without calling Stripe', async () => {
    const paid = mockPendingOrder({ status: 'confirmed', paymentStatus: 'paid' });
    findOrderByStripeCheckoutSessionForCafe.mockResolvedValue(paid);

    const result = await recoverOrderFromStripeCheckoutSession({
      sessionId: 'cs_test_abc',
      cafeId: 'cafe-1',
    });

    expect(result).toBe(paid);
    expect(retrieveStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it('confirms pending order from Stripe and emits KDS when paid', async () => {
    const pending = mockPendingOrder();
    const confirmed = mockPendingOrder({ status: 'confirmed', paymentStatus: 'paid' });
    findOrderByStripeCheckoutSessionForCafe.mockResolvedValue(pending);
    retrieveStripeCheckoutSession.mockResolvedValue({
      id: 'cs_test_abc',
      payment_status: 'paid',
      amount_total: 500,
      currency: 'gbp',
      payment_intent: 'pi_test',
      metadata: {
        moonshot_order_id: 'order-1',
        moonshot_cafe_id: 'cafe-1',
      },
    });
    confirmOrderPaidFromStripeCheckout.mockResolvedValue(confirmed);

    const result = await recoverOrderFromStripeCheckoutSession({
      sessionId: 'cs_test_abc',
      cafeId: 'cafe-1',
    });

    expect(confirmOrderPaidFromStripeCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        cafeId: 'cafe-1',
        stripeSessionId: 'cs_test_abc',
        amountMinor: 500,
      }),
    );
    expect(emitKdsServerToClient).toHaveBeenCalledWith('cafe-1', {
      type: 'kds:order:new',
      order: confirmed,
    });
    expect(recomputePickupEtasForCafe).toHaveBeenCalled();
    expect(result).toBe(confirmed);
  });

  it('does not emit KDS when Stripe session is not paid yet', async () => {
    const pending = mockPendingOrder();
    findOrderByStripeCheckoutSessionForCafe.mockResolvedValue(pending);
    retrieveStripeCheckoutSession.mockResolvedValue({
      id: 'cs_test_abc',
      payment_status: 'unpaid',
      amount_total: 500,
      currency: 'gbp',
      metadata: {
        moonshot_order_id: 'order-1',
        moonshot_cafe_id: 'cafe-1',
      },
    });

    const result = await recoverOrderFromStripeCheckoutSession({
      sessionId: 'cs_test_abc',
      cafeId: 'cafe-1',
    });

    expect(result).toBe(pending);
    expect(confirmOrderPaidFromStripeCheckout).not.toHaveBeenCalled();
    expect(emitKdsServerToClient).not.toHaveBeenCalled();
  });
});
