import type { NormalisedOrder } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiHttpError } from '../http-errors.js';

const poolConnect = vi.hoisted(() => vi.fn());
const fetchOrderWithItems = vi.hoisted(() => vi.fn());
const consumeRewardForOrder = vi.hoisted(() => vi.fn());

vi.mock('../../db.js', () => ({
  pool: { connect: poolConnect, query: vi.fn() },
}));

vi.mock('./order-read.js', () => ({
  fetchOrderWithItems,
}));

vi.mock('../loyalty/consume-reward-for-order.js', () => ({
  consumeRewardForOrder,
}));

import { confirmOrderPaidFromStripeCheckout } from './order-checkout.js';

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

describe('confirmOrderPaidFromStripeCheckout loyalty consume', () => {
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
    redeemRewardId: 'reward-1',
    userId: 'user-1',
  };

  it('still confirms payment when the loyalty reward was already redeemed', async () => {
    const pending = mockOrder();
    const confirmed = mockOrder({ status: 'confirmed', paymentStatus: 'paid' });
    fetchOrderWithItems.mockResolvedValueOnce(pending).mockResolvedValueOnce(confirmed);
    consumeRewardForOrder.mockRejectedValue(
      new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Reward not found or already redeemed')
    );

    const result = await confirmOrderPaidFromStripeCheckout(paidParams);

    expect(result).toEqual(confirmed);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).not.toHaveBeenCalledWith('ROLLBACK');
  });

  it('rolls back when loyalty consume fails for a non-redeemed reason', async () => {
    fetchOrderWithItems.mockResolvedValueOnce(mockOrder());
    consumeRewardForOrder.mockRejectedValue(new Error('db connection lost'));

    await expect(confirmOrderPaidFromStripeCheckout(paidParams)).rejects.toThrow(
      'db connection lost'
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  });
});
