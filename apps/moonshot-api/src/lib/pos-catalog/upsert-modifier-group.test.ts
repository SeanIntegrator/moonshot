import { describe, expect, it, vi } from 'vitest';
import { upsertModifierGroup } from './menu-catalog-upsert.js';
import type { PosCatalogModifierGroup } from '@moonshot/domain';

const group: PosCatalogModifierGroup = {
  id: 'g-b',
  posGroupId: 'MODLIST_B',
  name: 'Milk',
  selectionType: 'single',
  required: true,
  maxSelect: 1,
  options: [],
  role: 'milk',
};

describe('upsertModifierGroup', () => {
  it('reuses an existing same-name POS list instead of inserting a duplicate', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('AND pos_group_id = $2')) {
        return { rows: [] };
      }
      if (sql.includes('AND name = $2')) {
        return {
          rows: [{ id: 'existing-milk', pos_group_id: 'MODLIST_A', options: [] }],
        };
      }
      throw new Error(`unexpected sql: ${sql}`);
    });

    const id = await upsertModifierGroup({ query } as never, 'cafe-1', group, 0);
    expect(id).toBe('existing-milk');
    expect(query.mock.calls.some((c) => String(c[0]).includes('INSERT INTO modifier_groups'))).toBe(
      false,
    );
  });
});
