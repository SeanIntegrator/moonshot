import { describe, expect, it, vi } from 'vitest';
import { detachPosCatalogOwnership } from './detach-pos-ownership.js';

describe('detachPosCatalogOwnership', () => {
  it('clears POS ids on items, groups, and sections', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    await detachPosCatalogOwnership({ query } as never, 'cafe-1');

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[0]?.[0]).toContain('UPDATE menu_items');
    expect(query.mock.calls[1]?.[0]).toContain('UPDATE modifier_groups');
    expect(query.mock.calls[2]?.[0]).toContain('UPDATE menu_sections');
    expect(query.mock.calls[0]?.[1]).toEqual(['cafe-1']);
  });
});
