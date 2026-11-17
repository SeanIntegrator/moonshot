import type { NormalisedOrder } from '@moonshot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const poolConnect = vi.hoisted(() => vi.fn());
const poolQuery = vi.hoisted(() => vi.fn());
const fetchOrderWithItems = vi.hoisted(() => vi.fn());
const consumeRewardForOrder = vi.hoisted(() => vi.fn());
const findCafeById = vi.hoisted(() => vi.fn());
const getStripeConnectAccountId = vi.hoisted(() => vi.fn());
const expireStripeCheckoutSessionBestEffort = vi.hoisted(() => vi.fn());

vi.mock('../../db.js', () => ({
  pool: { connect: poolConnect, query: poolQuery },
}));

vi.mock('./order-read.js', () => ({
  fetchOrderWithItems,
}));

vi.mock('../loyalty/consume-reward-for-order.js', () => ({
  consumeRewardForOrder,
}));

vi.mock('../cafes-repository.js', () => ({
  findCafeById,
}));

vi.mock('../payments/cafe-payment-config.js', () => ({
  getStripeConnectAccountId,
}));

vi.mock('../payments/stripe-checkout.js', () => ({
  expireStripeCheckoutSessionBestEffort,
}));

import {
  canConfirmUnpaidCheckoutOrder,
  confirmOrderPaidFromStripeCheckout,
  expireUnpaidStripeCheckoutForOrder,
} from './order-checkout.js';

const ORDER_ID = 'order-1';
const CAFE_ID = 'cafe-1';

function mockOrder(overrides: Partial<NormalisedOrder> = {}): NormalisedOrder {
  return {
    id: ORDER_ID,
    cafeId: CAFE_ID,
    customerId: 'user-1',
    customerName: 'Patron',
    totalMinor: 500,
    currency: 'GBP',
    orderType: 'takeaway',
    source: 'app',
    status: 'pending',
    paymentStatus: 'unpaid',
    cancelReason: null,
    items: [],
    pickup: { quotedPickupTime: null, pickupTime: null, completedAt: null, etaMode: 'auto' },
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
    detailsPending: false,
    ...overrides,
  };
}

describe('canConfirmUnpaidCheckoutOrder', () => {
  it('allows pending unpaid drafts', () => {
    expect(canConfirmUnpaidCheckoutOrder(mockOrder())).toBe(true);
  });

  it('allows unpaid orders cancelled by auto_expire', () => {
    expect(
      canConfirmUnpaidCheckoutOrder(mockOrder({ status: 'cancelled', cancelReason: 'auto_expire' }))
    ).toBe(true);
  });

  it('allows unpaid orders cancelled by the customer so a late Checkout payment still confirms', () => {
    expect(
      canConfirmUnpaidCheckoutOrder(mockOrder({ status: 'cancelled', cancelReason: 'customer' }))
    ).toBe(true);
  });

  it('rejects already-paid orders', () => {
    expect(canConfirmUnpaidCheckoutOrder(mockOrder({ paymentStatus: 'paid' }))).toBe(false);
  });

  it('rejects in-progress kitchen tickets', () => {
    expect(canConfirmUnpaidCheckoutOrder(mockOrder({ status: 'preparing' }))).toBe(false);
  });
});

describe('expireUnpaidStripeCheckoutForOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCafeById.mockResolvedValue({ paymentConfig: { stripe: { accountId: 'acct_1' } } });
    getStripeConnectAccountId.mockReturnValue('acct_1');
    expireStripeCheckoutSessionBestEffort.mockResolvedValue(undefined);
  });

  it('expires an unpaid Checkout session on the connected account', async () => {
    poolQuery.mockResolvedValue({
      rows: [{ stripe_checkout_session_id: 'cs_test_abc', payment_status: 'unpaid' }],
    });

    await expireUnpaidStripeCheckoutForOrder({ orderId: ORDER_ID, cafeId: CAFE_ID });

    expect(expireStripeCheckoutSessionBestEffort).toHaveBeenCalledWith({
      sessionId: 'cs_test_abc',
      connectedAccountId: 'acct_1',
    });
  });

  it('skips paid orders', async () => {
    poolQuery.mockResolvedValue({
      rows: [{ stripe_checkout_session_id: 'cs_test_abc', payment_status: 'paid' }],
    });

    await expireUnpaidStripeCheckoutForOrder({ orderId: ORDER_ID, cafeId: CAFE_ID });

    expect(expireStripeCheckoutSessionBestEffort).not.toHaveBeenCalled();
  });

  it('skips when there is no Checkout session', async () => {
    poolQuery.mockResolvedValue({
      rows: [{ stripe_checkout_session_id: null, payment_status: 'unpaid' }],
    });

    await expireUnpaidStripeCheckoutForOrder({ orderId: ORDER_ID, cafeId: CAFE_ID });

    expect(expireStripeCheckoutSessionBestEffort).not.toHaveBeenCalled();
  });
});

describe('confirmOrderPaidFromStripeCheckout', () => {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    poolConnect.mockResolvedValue(client);
    client.query.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('UPDATE orders')) {
        return { rows: [{ id: ORDER_ID }] };
      }
      return { rows: [] };
    });
  });

  const paidParams = {
    orderId: ORDER_ID,
    cafeId: CAFE_ID,
    stripeSessionId: 'cs_test_abc',
    paymentIntentId: 'pi_test',
    amountMinor: 500,
    currency: 'GBP',
  };

  it('confirms a pending unpaid order', async () => {
    const pending = mockOrder();
    const confirmed = mockOrder({ status: 'confirmed', paymentStatus: 'paid' });
    fetchOrderWithItems.mockResolvedValueOnce(pending).mockResolvedValueOnce(confirmed);

    const result = await confirmOrderPaidFromStripeCheckout(paidParams);

    expect(result).toEqual(confirmed);
    const updateSql = String(
      client.query.mock.calls.find((c) => String(c[0]).includes('UPDATE orders'))?.[0]
    );
    expect(updateSql).toContain('cancel_reason = NULL');
    expect(updateSql).toContain("status IN ('pending', 'cancelled')");
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('reopens an unpaid customer-cancelled order so a late Stripe payment reaches the KDS', async () => {
    const cancelled = mockOrder({ status: 'cancelled', cancelReason: 'customer' });
    const confirmed = mockOrder({ status: 'confirmed', paymentStatus: 'paid', cancelReason: null });
    fetchOrderWithItems.mockResolvedValueOnce(cancelled).mockResolvedValueOnce(confirmed);

    const result = await confirmOrderPaidFromStripeCheckout(paidParams);

    expect(result).toEqual(confirmed);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('reopens an unpaid auto_expire order so a late Stripe payment reaches the KDS', async () => {
    const expired = mockOrder({ status: 'cancelled', cancelReason: 'auto_expire' });
    const confirmed = mockOrder({ status: 'confirmed', paymentStatus: 'paid', cancelReason: null });
    fetchOrderWithItems.mockResolvedValueOnce(expired).mockResolvedValueOnce(confirmed);

    const result = await confirmOrderPaidFromStripeCheckout(paidParams);

    expect(result).toEqual(confirmed);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('returns the existing row when already paid', async () => {
    const paid = mockOrder({ status: 'confirmed', paymentStatus: 'paid' });
    fetchOrderWithItems.mockResolvedValueOnce(paid);

    const result = await confirmOrderPaidFromStripeCheckout(paidParams);

    expect(result).toEqual(paid);
    expect(client.query.mock.calls.some((c) => String(c[0]).includes('UPDATE orders'))).toBe(false);
  });
});
