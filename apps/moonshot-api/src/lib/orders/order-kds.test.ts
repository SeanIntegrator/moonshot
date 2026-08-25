import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolQuery, poolConnect, fetchOrderWithItems, normalisedOrdersFromRows } = vi.hoisted(
  () => ({
    poolQuery: vi.fn(),
    poolConnect: vi.fn(),
    fetchOrderWithItems: vi.fn(),
    normalisedOrdersFromRows: vi.fn(),
  }),
);

vi.mock('../../db.js', () => ({
  pool: { query: poolQuery, connect: poolConnect },
}));

vi.mock('./order-read.js', () => ({
  fetchOrderWithItems,
  normalisedOrdersFromRows,
}));

vi.mock('./order-expire-stale.js', () => ({
  expireStaleOpenOrders: vi.fn().mockResolvedValue({ expired: 0, byCafe: {}, orders: [] }),
}));

import { KDS_OPEN_MAX_AGE_HOURS } from './order-constants.js';
import { listOpenOrdersForKds, recallLastCompletedOrderForKds } from './order-kds.js';

describe('listOpenOrdersForKds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalisedOrdersFromRows.mockResolvedValue([]);
  });

  it('filters open tickets to the last 16 hours', async () => {
    poolQuery.mockResolvedValue({ rows: [] });
    await listOpenOrdersForKds('cafe-1');
    const selectCall = poolQuery.mock.calls.find((c) =>
      String(c[0]).includes('FROM orders'),
    ) as [string, unknown[]] | undefined;
    expect(selectCall).toBeDefined();
    expect(selectCall![0]).toContain("$3 * INTERVAL '1 hour'");
    expect(selectCall![1][2]).toBe(KDS_OPEN_MAX_AGE_HOURS);
  });
});

describe('recallLastCompletedOrderForKds', () => {
  it('ignores completed tickets older than 16 hours', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('BEGIN') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    poolConnect.mockResolvedValue({ query, release: vi.fn() });

    const result = await recallLastCompletedOrderForKds('cafe-1');
    expect(result).toBeNull();
    const upd = query.mock.calls.find((c) => String(c[0]).includes('UPDATE orders'));
    expect(String(upd?.[0])).toContain("$2 * INTERVAL '1 hour'");
    expect(String(upd?.[0])).toContain("eta_mode = 'manual_override'");
    expect(upd?.[1]?.[0]).toBe('cafe-1');
    expect(upd?.[1]?.[1]).toBe(KDS_OPEN_MAX_AGE_HOURS);
    expect(typeof upd?.[1]?.[2]).toBe('string');
    expect(fetchOrderWithItems).not.toHaveBeenCalled();
  });
});
