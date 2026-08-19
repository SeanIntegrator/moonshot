import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { loadFoodSectionKeysForCafe } from './food-section-keys.js';

describe('loadFoodSectionKeysForCafe', () => {
  it('reads kind=food from menu_sections, not a stale kds_config snapshot', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ key: 'food' }] });
    const keys = await loadFoodSectionKeysForCafe({ query } as unknown as Pool, 'cafe-1');
    expect(keys).toEqual(['food']);
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]?.[0])).toMatch(/kind = 'food'/);
    expect(query.mock.calls[0]?.[1]).toEqual(['cafe-1']);
  });
});
