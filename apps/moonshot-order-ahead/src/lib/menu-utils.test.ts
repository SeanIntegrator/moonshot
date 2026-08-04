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
  it('promotes leaf children to top-level when parent has subcategories', () => {
    const sections = [
      section({ key: 'coffee', label: 'Coffee', sortOrder: 0 }),
      section({ key: 'hot_drinks', label: 'Hot drinks', parentKey: 'coffee', sortOrder: 1 }),
    ];
    const grouped = groupMenuByCategory(menu(sections, [item('hot_drinks', 'Latte')]));

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.category).toBe('hot_drinks');
    expect(grouped[0]?.label).toBe('Hot drinks');
    expect(grouped[0]?.items.map((i) => i.name)).toEqual(['Latte']);
    expect(grouped[0]?.children).toBeUndefined();
  });

  it('emits Food leaves Sweet and Savory without a Food parent header', () => {
    const sections = [
      section({ key: 'food', label: 'Food', sortOrder: 0, kind: 'food' }),
      section({ key: 'sweet', label: 'Sweet', parentKey: 'food', sortOrder: 1, kind: 'food' }),
      section({ key: 'savory', label: 'Savory', parentKey: 'food', sortOrder: 2, kind: 'food' }),
    ];
    const grouped = groupMenuByCategory(
      menu(sections, [item('sweet', 'Plain Croissant'), item('savory', 'Ham Croissant')]),
    );

    expect(grouped.map((s) => s.category)).toEqual(['sweet', 'savory']);
    expect(grouped.every((s) => s.children == null)).toBe(true);
  });

  it('keeps parent as its own section when it has direct items alongside children', () => {
    const sections = [
      section({ key: 'food', label: 'Food', sortOrder: 0, kind: 'food' }),
      section({ key: 'sweet', label: 'Sweet', parentKey: 'food', sortOrder: 1, kind: 'food' }),
    ];
    const grouped = groupMenuByCategory(
      menu(sections, [item('food', 'Platter'), item('sweet', 'Cookie')]),
    );

    expect(grouped.map((s) => s.category)).toEqual(['sweet', 'food']);
    expect(grouped.find((s) => s.category === 'food')?.items.map((i) => i.name)).toEqual(['Platter']);
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

  it('promotes leaf when parent would otherwise be an empty container', () => {
    const sections = [
      section({ key: 'ghost', label: 'Ghost', sortOrder: 0 }),
      section({ key: 'leaf', label: 'Leaf', parentKey: 'ghost', sortOrder: 1 }),
    ];
    const grouped = groupMenuByCategory(menu(sections, [item('leaf', 'Item')]));
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.category).toBe('leaf');
    expect(grouped[0]?.items).toHaveLength(1);
  });

  it('returns empty array when no available items', () => {
    const sections = [section({ key: 'coffee', label: 'Coffee' })];
    expect(groupMenuByCategory(menu(sections, []))).toEqual([]);
  });
});
