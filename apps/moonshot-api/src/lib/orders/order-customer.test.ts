import type { NormalisedOrder } from '@moonshot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolQuery, normalisedOrdersFromRows, expireStaleOpenOrders, fetchOrderWithItems } =
  vi.hoisted(() => ({
    poolQuery: vi.fn(),
    normalisedOrdersFromRows: vi.fn(),
    expireStaleOpenOrders: vi.fn(),
    fetchOrderWithItems: vi.fn(),
  }));

const expireUnpaidStripeCheckoutForOrder = vi.hoisted(() => vi.fn());

vi.mock('../../db.js', () => ({
  pool: { query: poolQuery },
}));

vi.mock('./order-read.js', () => ({
  fetchOrderWithItems,
  normalisedOrdersFromRows,
}));

vi.mock('./order-expire-stale.js', () => ({
  expireStaleOpenOrders,
}));

vi.mock('./order-checkout.js', () => ({
  expireUnpaidStripeCheckoutForOrder,
}));

import { cancelOrderAtCafe, listCustomerOrdersForUser } from './order-customer.js';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const CAFE_ID = '22222222-2222-4222-8222-222222222222';

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

describe('listCustomerOrdersForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolQuery.mockResolvedValue({ rows: [] });
    normalisedOrdersFromRows.mockResolvedValue([]);
  });

  it('lists only the caller rows and does not expire cafe-wide stale tickets', async () => {
    await listCustomerOrdersForUser({ cafeId: 'cafe-1', userId: 'user-1' });

    expect(expireStaleOpenOrders).not.toHaveBeenCalled();
    expect(poolQuery).toHaveBeenCalledTimes(2);
    for (const [sql, params] of poolQuery.mock.calls as [string, unknown[]][]) {
      expect(sql.trimStart().toUpperCase().startsWith('SELECT')).toBe(true);
      expect(sql).not.toMatch(/\bUPDATE\s+orders\b/i);
      expect(sql).toContain('cafe_id = $1 AND user_id = $2');
      expect(params[0]).toBe('cafe-1');
      expect(params[1]).toBe('user-1');
    }
  });
});

describe('cancelOrderAtCafe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    expireUnpaidStripeCheckoutForOrder.mockResolvedValue(undefined);
  });

  it('expires the Stripe Checkout session when cancelling an unpaid pending draft', async () => {
    const pending = mockOrder();
    const cancelled = mockOrder({ status: 'cancelled', cancelReason: 'customer' });
    fetchOrderWithItems.mockResolvedValueOnce(pending).mockResolvedValueOnce(cancelled);
    poolQuery.mockResolvedValue({ rows: [{ id: ORDER_ID }] });

    const result = await cancelOrderAtCafe(ORDER_ID, CAFE_ID);

    expect(result).toEqual({ kind: 'cancelled', order: cancelled });
    expect(expireUnpaidStripeCheckoutForOrder).toHaveBeenCalledWith({
      orderId: ORDER_ID,
      cafeId: CAFE_ID,
    });
  });

  it('does not expire Checkout when cancelling an already-paid ticket', async () => {
    const paid = mockOrder({ status: 'confirmed', paymentStatus: 'paid' });
    const cancelled = mockOrder({
      status: 'cancelled',
      paymentStatus: 'paid',
      cancelReason: 'customer',
    });
    fetchOrderWithItems.mockResolvedValueOnce(paid).mockResolvedValueOnce(cancelled);
    poolQuery.mockResolvedValue({ rows: [{ id: ORDER_ID }] });

    const result = await cancelOrderAtCafe(ORDER_ID, CAFE_ID);

    expect(result.kind).toBe('cancelled');
    expect(expireUnpaidStripeCheckoutForOrder).not.toHaveBeenCalled();
  });
});
