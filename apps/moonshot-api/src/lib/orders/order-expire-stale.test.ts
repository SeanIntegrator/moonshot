import type { NormalisedOrder } from '@moonshot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  poolQuery,
  normalisedOrdersFromRows,
  notifyOrderCancelled,
  recomputePickupEtasAfterOrderChange,
} = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  normalisedOrdersFromRows: vi.fn(),
  notifyOrderCancelled: vi.fn(),
  recomputePickupEtasAfterOrderChange: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: { query: poolQuery },
}));

vi.mock('./order-read.js', () => ({
  normalisedOrdersFromRows,
}));

vi.mock('./order-lifecycle-notify.js', () => ({
  notifyOrderCancelled,
  recomputePickupEtasAfterOrderChange,
}));

import { CUSTOMER_ACTIVE_STATUSES, KDS_OPEN_MAX_AGE_HOURS } from './order-constants.js';
import { expireStaleOpenOrders } from './order-expire-stale.js';

const CAFE_A = 'cafe-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAFE_B = 'cafe-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function staleOrder(partial: Partial<NormalisedOrder> & Pick<NormalisedOrder, 'id' | 'cafeId'>): NormalisedOrder {
  return {
    source: 'app',
    customerName: 'Guest',
    customerId: 'user-1',
    items: [],
    notes: null,
    orderType: 'takeaway',
    status: 'cancelled',
    cancelReason: 'auto_expire',
    paymentStatus: 'paid',
    totalMinor: 400,
    currency: 'GBP',
    pickup: {
      quotedPickupTime: null,
      pickupTime: null,
      completedAt: null,
      etaMode: 'auto',
    },
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
    detailsPending: false,
    ...partial,
  };
}

describe('expireStaleOpenOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recomputePickupEtasAfterOrderChange.mockResolvedValue(undefined);
  });

  it('no-ops when nothing is stale', async () => {
    poolQuery.mockResolvedValue({ rows: [] });
    const result = await expireStaleOpenOrders();
    expect(result).toEqual({ expired: 0, byCafe: {}, orders: [] });
    expect(notifyOrderCancelled).not.toHaveBeenCalled();
    expect(recomputePickupEtasAfterOrderChange).not.toHaveBeenCalled();
  });

  it('cancels active rows older than the KDS window with auto_expire', async () => {
    const rows = [{ id: 'o1', cafe_id: CAFE_A }];
    poolQuery.mockResolvedValue({ rows });
    const orders = [
      staleOrder({ id: 'o1', cafeId: CAFE_A }),
      staleOrder({ id: 'o2', cafeId: CAFE_B }),
    ];
    // Second normalised call if we only return one row — return matching orders.
    normalisedOrdersFromRows.mockResolvedValue([orders[0]!]);

    const result = await expireStaleOpenOrders();

    const [sql, params] = poolQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("cancel_reason = $3");
    expect(sql).toContain('board_opened_at <= NOW()');
    expect(sql).toContain("$2 * INTERVAL '1 hour'");
    expect(params[0]).toEqual([...CUSTOMER_ACTIVE_STATUSES]);
    expect(params[1]).toBe(KDS_OPEN_MAX_AGE_HOURS);
    expect(params[2]).toBe('auto_expire');

    expect(result.expired).toBe(1);
    expect(result.byCafe).toEqual({ [CAFE_A]: 1 });
    expect(notifyOrderCancelled).toHaveBeenCalledWith({
      cafeId: CAFE_A,
      order: orders[0],
    });
    expect(recomputePickupEtasAfterOrderChange).toHaveBeenCalledWith(
      expect.objectContaining({ cafeId: CAFE_A, logTag: 'orders.expire-stale' }),
    );
  });

  it('scopes by cafeId when provided', async () => {
    poolQuery.mockResolvedValue({ rows: [] });
    await expireStaleOpenOrders({ cafeId: CAFE_A });
    const [sql, params] = poolQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('cafe_id = $1');
    expect(params[0]).toBe(CAFE_A);
    expect(params[3]).toBe('auto_expire');
  });
});
