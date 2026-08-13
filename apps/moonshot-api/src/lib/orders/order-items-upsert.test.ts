import { describe, expect, it, vi } from 'vitest';
import { upsertOrderItems } from './order-items-upsert.js';

describe('upsertOrderItems', () => {
  it('inserts on conflict then deletes uids absent from the snapshot', async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const client = { query } as never;
    await upsertOrderItems(client, 'ord-1', [
      {
        posLineUid: 'li1',
        menuItemId: null,
        itemName: 'Latte',
        quantity: 1,
        unitPriceMinor: 300,
        modifiers: [],
        allergens: [],
        notes: null,
        category: null,
      },
      {
        posLineUid: 'li2',
        menuItemId: null,
        itemName: 'Muffin',
        quantity: 1,
        unitPriceMinor: 250,
        modifiers: [],
        allergens: [],
        notes: null,
        category: 'food',
      },
    ]);

    expect(query).toHaveBeenCalledTimes(3);
    expect(String(query.mock.calls[0]?.[0])).toContain('ON CONFLICT (order_id, pos_line_uid)');
    expect(query.mock.calls[0]?.[1]?.[1]).toBe('li1');
    expect(query.mock.calls[1]?.[1]?.[1]).toBe('li2');
    expect(String(query.mock.calls[2]?.[0])).toContain('pos_line_uid <> ALL');
    expect(query.mock.calls[2]?.[1]).toEqual(['ord-1', ['li1', 'li2']]);
  });

  it('deletes every line when the snapshot is empty', async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    await upsertOrderItems({ query } as never, 'ord-1', []);
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]?.[0])).toBe('DELETE FROM order_items WHERE order_id = $1');
  });
});
