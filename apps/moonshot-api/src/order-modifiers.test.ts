import { describe, expect, it } from 'vitest';
import type { CreateOrderLineInput, NormalisedMenuItem } from '@moonshot/types';
import { ApiHttpError } from '../src/lib/http-errors.js';
import { resolveModifiersForLine } from '../src/lib/order-modifiers.js';

function flatWhiteItem(): NormalisedMenuItem {
  return {
    id: 'mi-1',
    posItemId: null,
    name: 'Flat White',
    description: null,
    priceMinor: 350,
    currency: 'GBP',
    category: 'hot_drinks',
    subcategory: null,
    imageUrl: null,
    emoji: null,
    isAvailable: true,
    sizes: [],
    modifierGroups: [
      {
        id: 'g-milk',
        name: 'Milk',
        selectionType: 'single',
        required: true,
        options: [
          { id: 'o-whole', posOptionId: null, name: 'Whole', priceMinor: 0, isDefault: true },
          { id: 'o-oat', posOptionId: null, name: 'Oat', priceMinor: 50, isDefault: false },
        ],
      },
      {
        id: 'g-syrup',
        name: 'Syrup',
        selectionType: 'multi',
        required: false,
        options: [
          { id: 'o-van', posOptionId: null, name: 'Vanilla', priceMinor: 40, isDefault: false },
        ],
      },
    ],
    tags: [],
    archetype: null,
    waiveMilkSurcharge: false,
    allowNoMilk: false,
  };
}

function latteWithSizes(): NormalisedMenuItem {
  return {
    ...flatWhiteItem(),
    name: 'Latte',
    priceMinor: 300,
    sizes: [
      { id: 'sz-s', name: 'Small', priceMinor: 280, isDefault: false },
      { id: 'sz-m', name: 'Medium', priceMinor: 320, isDefault: true },
      { id: 'sz-l', name: 'Large', priceMinor: 360, isDefault: false },
    ],
  };
}

describe('resolveModifiersForLine', () => {
  it('applies default for required single group when no selection', () => {
    const line: CreateOrderLineInput = { menuItemId: 'mi-1', quantity: 1 };
    const { unitPriceMinor, modifiers } = resolveModifiersForLine(flatWhiteItem(), line);
    expect(unitPriceMinor).toBe(350);
    expect(modifiers).toHaveLength(1);
    expect(modifiers[0]!.optionId).toBe('o-whole');
  });

  it('adds modifier delta and stores group context with colour snapshot', () => {
    const line: CreateOrderLineInput = {
      menuItemId: 'mi-1',
      quantity: 1,
      modifiers: [
        { groupId: 'g-milk', optionId: 'o-oat' },
        { groupId: 'g-syrup', optionId: 'o-van' },
      ],
    };
    const { unitPriceMinor, modifiers } = resolveModifiersForLine(flatWhiteItem(), line);
    expect(unitPriceMinor).toBe(350 + 50 + 40);
    expect(modifiers.map((m) => m.groupId).sort()).toEqual(['g-milk', 'g-syrup']);
    expect(modifiers.find((m) => m.optionId === 'o-oat')?.priceMinor).toBe(50);
  });

  it('uses absolute size price as base and snapshots size row', () => {
    const line: CreateOrderLineInput = {
      menuItemId: 'mi-1',
      quantity: 1,
      sizeId: 'sz-l',
      modifiers: [{ groupId: 'g-milk', optionId: 'o-whole' }],
    };
    const { unitPriceMinor, modifiers } = resolveModifiersForLine(latteWithSizes(), line);
    expect(unitPriceMinor).toBe(360);
    expect(modifiers.some((m) => m.isSize && m.optionId === 'sz-l')).toBe(true);
  });

  it('defaults to default size when sizes exist but sizeId omitted', () => {
    const line: CreateOrderLineInput = { menuItemId: 'mi-1', quantity: 1 };
    const { unitPriceMinor } = resolveModifiersForLine(latteWithSizes(), line);
    expect(unitPriceMinor).toBe(320);
  });

  it('rejects unknown option', () => {
    const line: CreateOrderLineInput = {
      menuItemId: 'mi-1',
      quantity: 1,
      modifiers: [{ groupId: 'g-milk', optionId: 'o-bogus' }],
    };
    expect(() => resolveModifiersForLine(flatWhiteItem(), line)).toThrow(ApiHttpError);
  });
});
