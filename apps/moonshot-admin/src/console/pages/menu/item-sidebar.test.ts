import { describe, expect, it } from 'vitest';
import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import {
  isFeaturedItem,
  isFoodItem,
  itemListPriceMinor,
  itemsBySection,
  kitchenAbbrev,
  offeredOnCount,
  optionCountForChip,
} from './item-sidebar.js';

function item(partial: Partial<NormalisedMenuItem> & Pick<NormalisedMenuItem, 'id' | 'name'>): NormalisedMenuItem {
  return {
    posItemId: null,
    description: null,
    priceMinor: 380,
    currency: 'GBP',
    category: 'coffee',
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
    ...partial,
  };
}

const coffee: CafeMenuSection = {
  id: 's1',
  cafeId: 'c',
  key: 'coffee',
  label: 'Coffee',
  enabled: true,
  isSystem: false,
  sortOrder: 0,
  kind: 'drink',
};

const food: CafeMenuSection = {
  id: 's2',
  cafeId: 'c',
  key: 'food',
  label: 'Food',
  enabled: true,
  isSystem: true,
  sortOrder: 1,
  kind: 'food',
};

describe('itemsBySection', () => {
  it('groups under section headings and filters by search', () => {
    const items = [
      item({ id: '1', name: 'Latte', category: 'coffee' }),
      item({ id: '2', name: 'Croissant', category: 'food' }),
      item({ id: '3', name: 'Mystery', category: 'unknown' }),
    ];
    const all = itemsBySection(items, [coffee, food], '');
    expect(all.map((g) => g.label)).toEqual(['Coffee', 'Food', 'Other']);
    const q = itemsBySection(items, [coffee, food], 'lat');
    expect(q).toHaveLength(1);
    expect(q[0]!.items[0]!.name).toBe('Latte');
  });
});

describe('item list helpers', () => {
  it('treats food-kind sections as food', () => {
    expect(isFoodItem(item({ id: '1', name: 'Croissant', category: 'food' }), [coffee, food])).toBe(
      true,
    );
    expect(isFoodItem(item({ id: '2', name: 'Latte' }), [coffee, food])).toBe(false);
  });

  it('uses the default size price when present', () => {
    const withSizes = item({
      id: '1',
      name: 'Latte',
      priceMinor: 0,
      sizes: [
        { id: 'a', name: 'Small', priceMinor: 380, isDefault: true },
        { id: 'b', name: 'Regular', priceMinor: 420, isDefault: false },
      ],
    });
    expect(itemListPriceMinor(withSizes)).toBe(380);
  });

  it('detects featured tags', () => {
    expect(isFeaturedItem(item({ id: '1', name: 'Latte', tags: ['Featured'] }))).toBe(true);
    expect(isFeaturedItem(item({ id: '2', name: 'Tea' }))).toBe(false);
  });

  it('counts drinks offering a modifier list', () => {
    const milk = { id: 'm1' } as CafeModifierGroup;
    const items = [
      item({ id: '1', name: 'Latte', modifierGroups: [{ ...milk, name: 'Milk', selectionType: 'single', required: false, options: [] }] }),
      item({ id: '2', name: 'Tea', modifierGroups: [] }),
    ];
    expect(offeredOnCount(items, 'm1')).toBe(1);
  });

  it('sums options per chip', () => {
    const groups: CafeModifierGroup[] = [
      {
        id: '1',
        name: 'Milk',
        selectionType: 'single',
        required: false,
        options: [
          { id: 'a', posOptionId: null, name: 'Whole', priceMinor: 0, isDefault: true },
          { id: 'b', posOptionId: null, name: 'Oat', priceMinor: 50, isDefault: false },
        ],
        sortOrder: 0,
      },
    ];
    expect(optionCountForChip(groups, 'milk')).toBe(2);
    expect(optionCountForChip(groups, 'syrup')).toBe(0);
  });

  it('prefers chipLabel then two letters', () => {
    expect(kitchenAbbrev('Double', '2x')).toBe('2x');
    expect(kitchenAbbrev('Oat')).toBe('Oa');
  });
});
