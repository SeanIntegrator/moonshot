import { describe, expect, it } from 'vitest';
import type { NormalisedMenuItem, NormalisedOrderLineModifier } from '@moonshot/types';
import { isStandardModifierVariant } from './modifier-display.js';

function mod(
  partial: Partial<NormalisedOrderLineModifier> &
    Pick<NormalisedOrderLineModifier, 'groupId' | 'optionId' | 'optionName'>,
): NormalisedOrderLineModifier {
  return {
    groupName: 'Milk',
    priceMinor: 0,
    ...partial,
  };
}

const menuItem: NormalisedMenuItem = {
  id: 'item-1',
  posItemId: null,
  name: 'Flat white',
  description: null,
  priceMinor: 320,
  currency: 'GBP',
  category: 'hot_drinks',
  subcategory: null,
  imageUrl: null,
  emoji: null,
  isAvailable: true,
  sizes: [
    { id: 'sz-reg', name: 'Regular', priceMinor: 320, isDefault: true },
    { id: 'sz-lrg', name: 'Large', priceMinor: 360, isDefault: false },
  ],
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
  ],
  tags: [],
  archetype: null,
  waiveMilkSurcharge: false,
  allowNoMilk: false,
};

describe('isStandardModifierVariant', () => {
  it('hides snapshotted defaults', () => {
    expect(
      isStandardModifierVariant(
        mod({ groupId: 'g-milk', optionId: 'o-whole', optionName: 'Whole', isDefault: true }),
      ),
    ).toBe(true);
  });

  it('keeps snapshotted non-defaults', () => {
    expect(
      isStandardModifierVariant(
        mod({ groupId: 'g-milk', optionId: 'o-oat', optionName: 'Oat', isDefault: false }),
      ),
    ).toBe(false);
  });

  it('resolves legacy rows from the live menu', () => {
    expect(
      isStandardModifierVariant(
        mod({ groupId: 'g-milk', optionId: 'o-whole', optionName: 'Whole' }),
        menuItem,
      ),
    ).toBe(true);
    expect(
      isStandardModifierVariant(
        mod({ groupId: 'g-milk', optionId: 'o-oat', optionName: 'Oat' }),
        menuItem,
      ),
    ).toBe(false);
    expect(
      isStandardModifierVariant(
        mod({
          groupId: 'size',
          optionId: 'sz-reg',
          optionName: 'Regular',
          isSize: true,
        }),
        menuItem,
      ),
    ).toBe(true);
  });
});
