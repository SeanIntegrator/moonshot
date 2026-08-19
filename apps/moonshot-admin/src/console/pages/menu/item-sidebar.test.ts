import { describe, expect, it } from 'vitest';
import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import {
  firstSidebarItemId,
  isFeaturedItem,
  isFoodItem,
  itemListPriceMinor,
  itemsBySection,
  kitchenAbbrev,
  listsForFamilyTab,
  offeredOnCount,
  optionCountForFamily,
  resolveSidebarSelection,
  visibleCatalogListTabs,
} from './item-sidebar.js';
import { catalogGroupsForPos } from './modifier-list-copy.js';

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

  it('picks the first sidebar row, not the first API item', () => {
    const items = [
      item({ id: 'food', name: 'Croissant', category: 'food' }),
      item({ id: 'coffee', name: 'Cappuccino', category: 'coffee' }),
    ];
    expect(firstSidebarItemId(items, [coffee, food])).toBe('coffee');
  });
});

describe('resolveSidebarSelection', () => {
  it('keeps a just-created id until it appears in items', () => {
    const waiting = resolveSidebarSelection({
      creating: false,
      selectedId: 'new',
      pendingSelectId: 'new',
      itemIds: ['coffee'],
      fallbackId: 'coffee',
    });
    expect(waiting).toEqual({ selectedId: 'new', pendingSelectId: 'new' });

    const landed = resolveSidebarSelection({
      creating: false,
      selectedId: 'new',
      pendingSelectId: 'new',
      itemIds: ['coffee', 'new'],
      fallbackId: 'coffee',
    });
    expect(landed).toEqual({ selectedId: 'new', pendingSelectId: null });
  });
});

describe('listsForFamilyTab', () => {
  it('filters by saved slot so an unsaved type change stays on the current tab', () => {
    const saved: CafeModifierGroup = {
      id: '1',
      name: 'Milks',
      slot: 'other',
      selectionType: 'single',
      required: false,
      options: [],
      sortOrder: 0,
    };
    const draft = { ...saved, slot: 'milk' as const };
    const visible = listsForFamilyTab([saved], { '1': draft }, 'other');
    expect(visible).toEqual([draft]);
    expect(listsForFamilyTab([saved], { '1': draft }, 'milk')).toEqual([]);
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
    const milk = { id: 'm1', slot: 'milk' as const } as CafeModifierGroup;
    const items = [
      item({ id: '1', name: 'Latte', modifierGroups: [{ ...milk, name: 'Milk', selectionType: 'single', required: false, options: [] }] }),
      item({ id: '2', name: 'Tea', modifierGroups: [] }),
    ];
    expect(offeredOnCount(items, 'm1')).toBe(1);
  });

  it('sums options per family from stored slot', () => {
    const groups: CafeModifierGroup[] = [
      {
        id: '1',
        name: 'Milk',
        slot: 'milk',
        selectionType: 'single',
        required: false,
        options: [
          { id: 'a', posOptionId: null, name: 'Whole', priceMinor: 0, isDefault: true },
          { id: 'b', posOptionId: null, name: 'Oat', priceMinor: 50, isDefault: false },
        ],
        sortOrder: 0,
      },
    ];
    expect(optionCountForFamily(groups, 'milk')).toBe(2);
    expect(optionCountForFamily(groups, 'flavours')).toBe(0);
  });

  it('hides empty POS leftover chips after catalog filter', () => {
    const groups: CafeModifierGroup[] = [
      {
        id: '1',
        name: 'Milk',
        slot: 'milk',
        posGroupId: 'MODLIST_MILK',
        selectionType: 'single',
        required: false,
        options: [
          { id: 'a', posOptionId: null, name: 'Whole', priceMinor: 0, isDefault: true },
          { id: 'b', posOptionId: null, name: 'Oat', priceMinor: 50, isDefault: false },
        ],
        sortOrder: 0,
      },
      {
        id: '2',
        name: 'Toppings',
        slot: 'toppings',
        posGroupId: null,
        selectionType: 'multi',
        required: false,
        options: [{ id: 'c', posOptionId: null, name: 'Cream', priceMinor: 0, isDefault: false }],
        sortOrder: 1,
      },
    ];
    const library = catalogGroupsForPos(groups, true);
    const tabs = [
      { value: 'milk' as const, label: 'Milk' },
      { value: 'flavours' as const, label: 'Flavours' },
    ];
    expect(optionCountForFamily(library, 'milk')).toBe(2);
    expect(optionCountForFamily(library, 'flavours')).toBe(0);
    expect(visibleCatalogListTabs(tabs, library, true).map((t) => t.value)).toEqual(['milk']);
    expect(visibleCatalogListTabs(tabs, groups, false).map((t) => t.value)).toEqual([
      'milk',
      'flavours',
    ]);
  });

  it('prefers chipLabel then two letters', () => {
    expect(kitchenAbbrev('Double', '2x')).toBe('2x');
    expect(kitchenAbbrev('Oat')).toBe('Oa');
  });
});
