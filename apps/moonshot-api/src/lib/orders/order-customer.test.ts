import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolQuery, normalisedOrdersFromRows, expireStaleOpenOrders } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  normalisedOrdersFromRows: vi.fn(),
  expireStaleOpenOrders: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: { query: poolQuery },
}));

vi.mock('./order-read.js', () => ({
  fetchOrderWithItems: vi.fn(),
  normalisedOrdersFromRows,
}));

vi.mock('./order-expire-stale.js', () => ({
  expireStaleOpenOrders,
}));

import { listCustomerOrdersForUser } from './order-customer.js';

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
