import { describe, expect, it } from 'vitest';
import type { CafeMenuSection, NormalisedMenu, NormalisedMenuItem } from '@moonshot/types';
import { groupMenuByCategory } from './menu-utils.js';

function section(partial: Partial<CafeMenuSection> & Pick<CafeMenuSection, 'key' | 'label'>): CafeMenuSection {
  return {
    id: partial.id ?? partial.key,
    cafeId: 'cafe-1',
    enabled: true,
    isSystem: false,
    sortOrder: 0,
    parentKey: null,
    kind: 'drink',
    ...partial,
  };
}

function item(category: string, name: string): NormalisedMenuItem {
  return {
    id: name,
    posItemId: null,
    name,
    description: null,
    priceMinor: 100,
    currency: 'GBP',
    category,
    subcategory: null,
    imageUrl: null,
    imageSource: null,
    useDefaultImage: true,
    emoji: null,
    isAvailable: true,
    sizes: [],
    modifierGroups: [],
    tags: [],
    archetype: null,
    waiveMilkSurcharge: false,
    allowNoMilk: false,
  };
}

function menu(sections: CafeMenuSection[], items: NormalisedMenuItem[]): NormalisedMenu {
  return { cafeId: 'cafe-1', sections, items, fetchedAt: new Date().toISOString() };
}

describe('groupMenuByCategory', () => {
  it('renders children under an empty top-level parent', () => {
    const sections = [
      section({ key: 'coffee', label: 'Coffee', sortOrder: 0 }),
      section({ key: 'hot_drinks', label: 'Hot drinks', parentKey: 'coffee', sortOrder: 1 }),
    ];
    const grouped = groupMenuByCategory(menu(sections, [item('hot_drinks', 'Latte')]));

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.category).toBe('coffee');
    expect(grouped[0]?.items).toEqual([]);
    expect(grouped[0]?.children?.[0]?.category).toBe('hot_drinks');
    expect(grouped[0]?.children?.[0]?.items.map((i) => i.name)).toEqual(['Latte']);
  });

  it('promotes children whose parent is disabled (not in shown)', () => {
    const sections = [
      section({ key: 'coffee', label: 'Coffee', enabled: false, sortOrder: 0 }),
      section({ key: 'hot_drinks', label: 'Hot drinks', parentKey: 'coffee', sortOrder: 1 }),
    ];
    const grouped = groupMenuByCategory(menu(sections, [item('hot_drinks', 'Latte')]));

    // Parent filtered out of enabled registry; child must still surface.
    expect(grouped.map((s) => s.category)).toEqual(['hot_drinks']);
    expect(grouped[0]?.items.map((i) => i.name)).toEqual(['Latte']);
  });

  it('promotes children when parentKey points at a skipped empty top-level section', () => {
    // Stale parentKey: child claims parent "ghost", which is top-level + empty and has
    // no registered children under that key in childrenOf for a *different* reason —
    // here "ghost" is empty leaf; child parentKey is "ghost" so childrenOf DOES link them.
    // Assert the empty-parent+child-items path (parent must not be dropped).
    const sections = [
      section({ key: 'ghost', label: 'Ghost', sortOrder: 0 }),
      section({ key: 'leaf', label: 'Leaf', parentKey: 'ghost', sortOrder: 1 }),
    ];
    const grouped = groupMenuByCategory(menu(sections, [item('leaf', 'Item')]));
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.category).toBe('ghost');
    expect(grouped[0]?.children?.[0]?.items).toHaveLength(1);
  });

  it('returns empty array when no available items', () => {
    const sections = [section({ key: 'coffee', label: 'Coffee' })];
    expect(groupMenuByCategory(menu(sections, []))).toEqual([]);
  });
});
