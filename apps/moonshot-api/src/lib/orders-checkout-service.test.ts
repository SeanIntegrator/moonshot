import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NormalisedOrder } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from './http-errors.js';
import { createStripeCheckoutOrderResponse } from './orders-checkout-service.js';

const resolveOrderLinesWithModifiers = vi.hoisted(() => vi.fn());

const insertPendingOrderWithResolvedLines = vi.hoisted(() => vi.fn());
const recordStripeCheckoutSessionForOrder = vi.hoisted(() => vi.fn());
const deleteAbandonedPendingOrder = vi.hoisted(() => vi.fn());
const fetchOrderWithItems = vi.hoisted(() => vi.fn());
const createStripeCheckoutSessionDirectCharge = vi.hoisted(() => vi.fn());

const getStripeOrNull = vi.hoisted(() => vi.fn());
const isStripeConnectReady = vi.hoisted(() => vi.fn());
const getStripeConnectAccountId = vi.hoisted(() => vi.fn());

vi.mock('./order-modifiers.js', () => ({
  resolveOrderLinesWithModifiers: resolveOrderLinesWithModifiers,
}));

vi.mock('./orders-repository.js', () => ({
  insertPendingOrderWithResolvedLines,
  deleteAbandonedPendingOrder,
  recordStripeCheckoutSessionForOrder,
  fetchOrderWithItems,
}));

vi.mock('./payments/stripe-checkout.js', () => ({
  createStripeCheckoutSessionDirectCharge,
}));

vi.mock('./payments/stripe-client.js', () => ({
  getStripeOrNull,
}));

vi.mock('./payments/cafe-payment-config.js', () => ({
  isStripeConnectReady,
  getStripeConnectAccountId,
}));

vi.mock('./order-checkout-env.js', () => ({
  checkoutUrlsForCafe: (slug: string) => ({
    successUrl: `https://order-ahead.test/${slug}/checkout/restore?checkout_session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `https://order-ahead.test/${slug}/checkout`,
  }),
}));

vi.mock('./customer-socket-token.js', () => ({
  signTrackOrderJwt: vi.fn(() => 'guest-tracking-jwt'),
}));

function mockOrder(overrides: Partial<NormalisedOrder> = {}): NormalisedOrder {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    cafeId: '22222222-2222-2222-2222-222222222222',
    source: 'app',
    customerName: 'Sam Guest',
    customerId: null,
    items: [],
    notes: null,
    orderType: 'takeaway',
    status: 'pending',
    paymentStatus: 'unpaid',
    totalMinor: 350,
    currency: 'GBP',
    pickup: {
      quotedPickupTime: null,
      pickupTime: null,
      completedAt: null,
      etaMode: 'auto',
    },
    createdAt: '2026-05-18T12:00:00.000Z',
    updatedAt: '2026-05-18T12:00:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
    ...overrides,
  };
}

describe('createStripeCheckoutOrderResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'unit-test-jwt-secret';

    resolveOrderLinesWithModifiers.mockResolvedValue({
      lines: [
        {
          menuItemId: 'menu-1',
          itemName: 'Latte',
          quantity: 1,
          unitPriceMinor: 350,
          modifiers: [],
          notes: null,
          currency: 'GBP',
        },
      ],
      currency: 'GBP',
      totalMinor: 350,
    });
    getStripeOrNull.mockReturnValue({});
    isStripeConnectReady.mockReturnValue(true);
    getStripeConnectAccountId.mockReturnValue('acct_unit_test');
    insertPendingOrderWithResolvedLines.mockResolvedValue(mockOrder());
    fetchOrderWithItems.mockResolvedValue(null);
    createStripeCheckoutSessionDirectCharge.mockResolvedValue({
      sessionId: 'cs_test_unit',
      url: 'https://stripe.test/checkout/cs_test_unit',
      paymentIntentId: 'pi_unit',
    });
    recordStripeCheckoutSessionForOrder.mockResolvedValue(undefined);
    deleteAbandonedPendingOrder.mockResolvedValue(undefined);
  });

  it('throws when Stripe client is not configured', async () => {
    getStripeOrNull.mockReturnValue(null);

    await expect(
      createStripeCheckoutOrderResponse({
        cafeId: mockOrder().cafeId,
        cafeSlug: 'test-cafe',
        userId: null,
        customerName: 'Sam',
        notes: null,
        orderType: 'takeaway',
        lines: [{ menuItemId: 'menu-1', quantity: 1 }],
        paymentConfig: {},
      }),
    ).rejects.toMatchObject({
      status: 503,
      code: ApiErrorCode.CONFIG,
    });

    expect(insertPendingOrderWithResolvedLines).not.toHaveBeenCalled();
  });

  it('creates Checkout session then persists payment_sessions before returning checkoutUrl', async () => {
    const refreshed = mockOrder({ totalMinor: 350 });
    fetchOrderWithItems.mockResolvedValue(refreshed);

    const result = await createStripeCheckoutOrderResponse({
      cafeId: refreshed.cafeId,
      cafeSlug: 'test-cafe',
      userId: null,
      customerName: 'Sam Guest',
      notes: null,
      orderType: 'takeaway',
      lines: [{ menuItemId: 'menu-1', quantity: 1 }],
      paymentConfig: { stripe: { chargesEnabled: true } },
    });

    expect(resolveOrderLinesWithModifiers).toHaveBeenCalledTimes(1);
    expect(insertPendingOrderWithResolvedLines).toHaveBeenCalledTimes(1);
    expect(createStripeCheckoutSessionDirectCharge).toHaveBeenCalledTimes(1);

    expect(recordStripeCheckoutSessionForOrder).toHaveBeenCalledWith({
      orderId: refreshed.id,
      cafeId: refreshed.cafeId,
      sessionId: 'cs_test_unit',
      paymentIntentId: 'pi_unit',
      amountMinor: 350,
      currency: 'GBP',
    });

    expect(result.checkoutUrl).toBe('https://stripe.test/checkout/cs_test_unit');
    expect(result.order.id).toBe(refreshed.id);
    expect(result.trackingToken).toBe('guest-tracking-jwt');
    expect(deleteAbandonedPendingOrder).not.toHaveBeenCalled();
  });

  it('deletes abandoned pending order when Stripe session creation fails', async () => {
    createStripeCheckoutSessionDirectCharge.mockRejectedValue(new Error('stripe outage'));

    await expect(
      createStripeCheckoutOrderResponse({
        cafeId: mockOrder().cafeId,
        cafeSlug: 'test-cafe',
        userId: null,
        customerName: 'Sam Guest',
        notes: null,
        orderType: 'takeaway',
        lines: [{ menuItemId: 'menu-1', quantity: 1 }],
        paymentConfig: {},
      }),
    ).rejects.toMatchObject({ message: 'stripe outage' });

    expect(deleteAbandonedPendingOrder).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    );
    expect(recordStripeCheckoutSessionForOrder).not.toHaveBeenCalled();
  });

  it('deletes abandoned pending order when recording the session fails after Stripe succeeds', async () => {
    recordStripeCheckoutSessionForOrder.mockRejectedValue(new Error('db write failed'));

    await expect(
      createStripeCheckoutOrderResponse({
        cafeId: mockOrder().cafeId,
        cafeSlug: 'test-cafe',
        userId: null,
        customerName: 'Sam Guest',
        notes: null,
        orderType: 'takeaway',
        lines: [{ menuItemId: 'menu-1', quantity: 1 }],
        paymentConfig: {},
      }),
    ).rejects.toMatchObject({ message: 'db write failed' });

    expect(deleteAbandonedPendingOrder).toHaveBeenCalled();
  });

  it('omits tracking token for logged-in customers', async () => {
    fetchOrderWithItems.mockResolvedValue(mockOrder({ customerId: 'user-uuid' }));

    const result = await createStripeCheckoutOrderResponse({
      cafeId: mockOrder().cafeId,
      cafeSlug: 'test-cafe',
      userId: 'user-uuid',
      customerName: 'Sam Member',
      notes: null,
      orderType: 'takeaway',
      lines: [{ menuItemId: 'menu-1', quantity: 1 }],
      paymentConfig: {},
    });

    expect(result.trackingToken).toBeUndefined();
    expect(result.checkoutUrl).toBeDefined();
  });

  it('maps Stripe missing checkout URL to ApiHttpError', async () => {
    createStripeCheckoutSessionDirectCharge.mockResolvedValue({
      sessionId: 'cs_emptyurl',
      url: null,
      paymentIntentId: null,
    });

    await expect(
      createStripeCheckoutOrderResponse({
        cafeId: mockOrder().cafeId,
        cafeSlug: 'test-cafe',
        userId: null,
        customerName: 'Sam Guest',
        notes: null,
        orderType: 'takeaway',
        lines: [{ menuItemId: 'menu-1', quantity: 1 }],
        paymentConfig: {},
      }),
    ).rejects.toBeInstanceOf(ApiHttpError);
  });
});
