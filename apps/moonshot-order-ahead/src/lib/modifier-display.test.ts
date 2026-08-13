import { describe, expect, it } from 'vitest';
import type { NormalisedMenuItem, NormalisedOrderLineModifier } from '@moonshot/types';
import {
  customerModifierSummary,
  isStandardModifierVariant,
  nonStandardCartLineLabels,
} from './modifier-display.js';

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
  imageSource: null,
  useDefaultImage: true,
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
    {
      id: 'g-temp',
      name: 'Milk Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'o-hot', posOptionId: null, name: 'Hot', priceMinor: 0, isDefault: true },
        { id: 'o-xh', posOptionId: null, name: 'Extra Hot', priceMinor: 0, isDefault: false },
      ],
    },
    {
      id: 'g-beans',
      name: 'Beans',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'o-house', posOptionId: null, name: 'House', priceMinor: 0, isDefault: true },
        { id: 'o-decaf', posOptionId: null, name: 'Decaf', priceMinor: 0, isDefault: false },
      ],
    },
    {
      id: 'g-shots',
      name: 'Shots',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'o-double', posOptionId: null, name: 'Double', priceMinor: 0, isDefault: true },
        { id: 'o-triple', posOptionId: null, name: 'Triple shot', priceMinor: 40, isDefault: false },
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

describe('nonStandardCartLineLabels', () => {
  it('hides default size and default modifiers', () => {
    expect(
      nonStandardCartLineLabels(menuItem, {
        sizeId: 'sz-reg',
        modifiers: [
          { groupId: 'g-milk', optionId: 'o-whole' },
          { groupId: 'g-shots', optionId: 'o-double' },
        ],
      }),
    ).toEqual([]);
  });

  it('keeps non-default size and modifiers', () => {
    expect(
      nonStandardCartLineLabels(menuItem, {
        sizeId: 'sz-lrg',
        modifiers: [
          { groupId: 'g-milk', optionId: 'o-oat' },
          { groupId: 'g-shots', optionId: 'o-triple' },
        ],
      }),
    ).toEqual(['Large', 'Oat', 'Triple shot']);
  });

  it('returns empty when the menu item is missing', () => {
    expect(
      nonStandardCartLineLabels(undefined, {
        sizeId: 'sz-lrg',
        modifiers: [{ groupId: 'g-milk', optionId: 'o-oat' }],
      }),
    ).toEqual([]);
  });
});

describe('customerModifierSummary', () => {
  it('shows oat and hides default hot / whole / house', () => {
    expect(
      customerModifierSummary([
        mod({
          groupId: 'g-temp',
          groupName: 'Milk Temperature',
          optionId: 'o-hot',
          optionName: 'Hot',
          isDefault: true,
        }),
        mod({
          groupId: 'g-milk',
          optionId: 'o-oat',
          optionName: 'Oat',
          isDefault: false,
        }),
        mod({
          groupId: 'g-beans',
          groupName: 'Beans',
          optionId: 'o-house',
          optionName: 'House',
          isDefault: true,
        }),
      ]),
    ).toBe('Oat');
  });

  it('shows extra hot and hides default whole / house', () => {
    expect(
      customerModifierSummary([
        mod({
          groupId: 'g-temp',
          groupName: 'Milk Temperature',
          optionId: 'o-xh',
          optionName: 'Extra Hot',
          isDefault: false,
        }),
        mod({
          groupId: 'g-milk',
          optionId: 'o-whole',
          optionName: 'Whole',
          isDefault: true,
        }),
        mod({
          groupId: 'g-beans',
          groupName: 'Beans',
          optionId: 'o-house',
          optionName: 'House',
          isDefault: true,
        }),
      ]),
    ).toBe('Extra Hot');
  });

  it('returns empty when every option is default', () => {
    expect(
      customerModifierSummary([
        mod({
          groupId: 'g-temp',
          groupName: 'Milk Temperature',
          optionId: 'o-hot',
          optionName: 'Hot',
          isDefault: true,
        }),
        mod({
          groupId: 'g-milk',
          optionId: 'o-whole',
          optionName: 'Whole',
          isDefault: true,
        }),
        mod({
          groupId: 'g-beans',
          groupName: 'Beans',
          optionId: 'o-house',
          optionName: 'House',
          isDefault: true,
        }),
      ]),
    ).toBe('');
  });

  it('hides legacy whole via live menu when isDefault is missing', () => {
    expect(
      customerModifierSummary(
        [
          mod({ groupId: 'g-milk', optionId: 'o-whole', optionName: 'Whole' }),
          mod({
            groupId: 'g-temp',
            groupName: 'Milk Temperature',
            optionId: 'o-xh',
            optionName: 'Extra Hot',
          }),
        ],
        menuItem,
      ),
    ).toBe('Extra Hot');
  });
});
