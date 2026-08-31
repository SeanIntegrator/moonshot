import type { KdsConfig } from '@moonshot/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { emitKdsServerToClient, emitCustomerServerToClient } = vi.hoisted(() => ({
  emitKdsServerToClient: vi.fn(),
  emitCustomerServerToClient: vi.fn(),
}));

vi.mock('../realtime/kds-events.js', () => ({ emitKdsServerToClient }));
vi.mock('../realtime/customer-events.js', () => ({ emitCustomerServerToClient }));

import { recomputePickupEtasForCafe } from './pickup-eta.js';

const kdsConfig = { eta: { basePrepMinutes: 8, perItemMinutes: 2 } } as KdsConfig;

describe('recomputePickupEtasForCafe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('walks the open queue in board_opened_at order', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await recomputePickupEtasForCafe({ db: { query } as never, cafeId: 'cafe-1', kdsConfig });

    const selectCall = query.mock.calls.find((c) => String(c[0]).includes('FROM orders o')) as
      [string, unknown[]] | undefined;
    expect(selectCall).toBeDefined();
    expect(selectCall![0]).toContain('ORDER BY o.board_opened_at ASC');
    expect(selectCall![0]).toContain('o.board_opened_at');
    expect(selectCall![0]).not.toContain('ORDER BY o.created_at');
  });

  it('does not let a recalled remake at the back of the board inflate earlier ETAs', async () => {
    const query = vi.fn(async (sql: string) => {
      if (String(sql).includes('FROM orders o')) {
        return {
          rows: [
            {
              id: 'newer-open',
              items_qty: '1',
              requested_pickup_not_before: null,
              eta_mode: 'auto',
            },
            {
              // Older created_at remake: last on the board after recall.
              id: 'recalled-remake',
              items_qty: '10',
              requested_pickup_not_before: null,
              eta_mode: 'manual_override',
            },
          ],
        };
      }
      return { rows: [] };
    });

    await recomputePickupEtasForCafe({ db: { query } as never, cafeId: 'cafe-1', kdsConfig });

    const updates = query.mock.calls.filter((c) => String(c[0]).includes('SET pickup_time'));
    expect(updates).toHaveLength(1);
    expect(updates[0]![1]).toEqual(['2026-08-26T12:08:00.000Z', 'newer-open', 'cafe-1']);
  });
});
