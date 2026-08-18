import { describe, expect, it } from 'vitest';
import { catalogGroupsForPos, isPosCatalogCafe } from '@moonshot/domain';

describe('catalogGroupsForPos', () => {
  const seed = { id: 'seed', name: 'Milks', posGroupId: null };
  const pos = { id: 'pos', name: 'Milk', posGroupId: 'MODLIST_MILK' };

  it('keeps every list for a Moonshot café', () => {
    expect(catalogGroupsForPos([seed, pos], false)).toEqual([seed, pos]);
  });

  it('drops signup templates when the café is POS-only', () => {
    expect(catalogGroupsForPos([seed, pos], true)).toEqual([pos]);
  });
});

describe('isPosCatalogCafe', () => {
  it('is true while Square is active or needs reauth', () => {
    expect(isPosCatalogCafe({ connected: true, status: 'active' })).toBe(true);
    expect(isPosCatalogCafe({ connected: false, status: 'needs_reauth' })).toBe(true);
  });

  it('is false with no connection', () => {
    expect(isPosCatalogCafe(null)).toBe(false);
    expect(isPosCatalogCafe({ connected: false, status: null })).toBe(false);
  });
});
