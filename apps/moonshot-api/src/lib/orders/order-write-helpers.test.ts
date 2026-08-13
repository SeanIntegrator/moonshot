import { describe, expect, it, vi } from 'vitest';
import { insertOrderItems } from './order-write-helpers.js';
import type { ResolvedOrderLine } from '../order-modifiers.js';

const line: ResolvedOrderLine = {
  menuItemId: 'm1',
  itemName: 'Latte',
  category: 'hot_drinks',
  unitPriceMinor: 350,
  quantity: 1,
  notes: null,
  currency: 'GBP',
  modifiers: [],
  allergens: [],
};

describe('insertOrderItems', () => {
  it('casts modifiers as jsonb, not unit_price_minor', async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    await insertOrderItems({ query } as never, 'ord-1', [line]);

    expect(query).toHaveBeenCalledTimes(1);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('$7::jsonb');
    expect(sql).not.toContain('$6::jsonb');
    expect(query.mock.calls[0]?.[1]).toEqual([
      'ord-1',
      'app:0',
      'm1',
      'Latte',
      1,
      350,
      '[]',
      [],
      null,
      'hot_drinks',
    ]);
  });
});
