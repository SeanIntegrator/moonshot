import { describe, expect, it } from 'vitest';
import type { KdsConfig, NormalisedOrderItem, NormalisedOrderLineModifier } from '@moonshot/types';
import {
  DEFAULT_KDS_AUDIO,
  DEFAULT_MODIFIER_CLASSIFICATION,
  groupKdsLines,
  kdsLineIdentityKey,
} from '@moonshot/domain';

function baseConfig(overrides?: Partial<KdsConfig>): KdsConfig {
  return {
    cafeId: 'cafe-1',
    milkColors: {},
    beanBadges: {
      house: { label: 'Ho', bg: '#2d2d2d', text: '#f5f5f5', accent: '#e8a33d' },
      decaf: { label: 'Dc', bg: '#6b4f2a', text: '#fff', accent: '#7aa2d6' },
      guest: { label: 'Gu', bg: '#1a4d3a', text: '#fff', accent: '#7fb069' },
      custom: [],
    },
    modifierClassification: {
      coffeeModifiers: [...DEFAULT_MODIFIER_CLASSIFICATION.coffeeModifiers],
      additions: [...DEFAULT_MODIFIER_CLASSIFICATION.additions],
      shots: [...DEFAULT_MODIFIER_CLASSIFICATION.shots],
      beans: [...DEFAULT_MODIFIER_CLASSIFICATION.beans],
      milkTemperature: [...DEFAULT_MODIFIER_CLASSIFICATION.milkTemperature],
      milkTexture: [...DEFAULT_MODIFIER_CLASSIFICATION.milkTexture],
    },
    timerThresholds: { greenMax: 3, amberMax: 5 },
    layout: { columns: 3, groupBy: 'order_type' },
    audio: { ...DEFAULT_KDS_AUDIO },
    display: {
      showCustomerNameInHeader: true,
      showPickupTime: true,
      showOrderSource: true,
    },
    eta: { basePrepMinutes: 8, perItemMinutes: 2 },
    foodSectionKeys: ['food'],
    drinkSectionKeys: ['hot_drinks', 'matcha', 'cold_drinks'],
    ...overrides,
  };
}

function mod(
  partial: Partial<NormalisedOrderLineModifier> &
    Pick<NormalisedOrderLineModifier, 'groupId' | 'groupName' | 'optionId' | 'optionName'>,
): NormalisedOrderLineModifier {
  return {
    priceMinor: 0,
    ...partial,
  };
}

function line(
  partial: Partial<NormalisedOrderItem> & Pick<NormalisedOrderItem, 'id' | 'itemName'>,
): NormalisedOrderItem {
  return {
    menuItemId: null,
    quantity: 1,
    unitPriceMinor: 350,
    allergens: [],
    notes: null,
    modifiers: [],
    category: 'hot_drinks',
    ...partial,
  };
}

describe('kdsLineIdentityKey', () => {
  it('treats same menu item + modifiers + notes + allergens as identical', () => {
    const a = line({
      id: '1',
      menuItemId: 'mi-latte',
      itemName: 'Latte',
      modifiers: [mod({ groupId: 'g-milk', groupName: 'Milks', optionId: 'o-oat', optionName: 'Oat' })],
    });
    const b = line({
      id: '2',
      menuItemId: 'mi-latte',
      itemName: 'Latte',
      modifiers: [mod({ groupId: 'g-milk', groupName: 'Milks', optionId: 'o-oat', optionName: 'Oat' })],
    });
    expect(kdsLineIdentityKey(a)).toBe(kdsLineIdentityKey(b));
  });

  it('differs when milk option differs', () => {
    const a = line({
      id: '1',
      menuItemId: 'mi-latte',
      itemName: 'Latte',
      modifiers: [mod({ groupId: 'g-milk', groupName: 'Milks', optionId: 'o-oat', optionName: 'Oat' })],
    });
    const b = line({
      id: '2',
      menuItemId: 'mi-latte',
      itemName: 'Latte',
      modifiers: [
        mod({ groupId: 'g-milk', groupName: 'Milks', optionId: 'o-whole', optionName: 'Whole' }),
      ],
    });
    expect(kdsLineIdentityKey(a)).not.toBe(kdsLineIdentityKey(b));
  });
});

describe('groupKdsLines', () => {
  it('merges latte + croissant + latte into latte qty 2 then croissant', () => {
    const grouped = groupKdsLines(
      [
        line({ id: 'a', menuItemId: 'mi-latte', itemName: 'Latte', category: 'hot_drinks' }),
        line({ id: 'b', menuItemId: 'mi-croi', itemName: 'Croissant', category: 'food' }),
        line({ id: 'c', menuItemId: 'mi-latte', itemName: 'Latte', category: 'hot_drinks' }),
      ],
      baseConfig(),
    );

    expect(grouped).toHaveLength(2);
    expect(grouped[0]!.item.itemName).toBe('Latte');
    expect(grouped[0]!.quantity).toBe(2);
    expect(grouped[0]!.sourceIds).toEqual(['a', 'c']);
    expect(grouped[0]!.view.isFood).toBe(false);
    expect(grouped[1]!.item.itemName).toBe('Croissant');
    expect(grouped[1]!.view.isFood).toBe(true);
  });

  it('keeps coffee drinks adjacent before matcha regardless of order', () => {
    const grouped = groupKdsLines(
      [
        line({ id: '1', itemName: 'Matcha Latte', category: 'matcha', menuItemId: 'm1' }),
        line({ id: '2', itemName: 'Flat White', category: 'hot_drinks', menuItemId: 'm2' }),
        line({ id: '3', itemName: 'Matcha', category: 'matcha', menuItemId: 'm3' }),
        line({ id: '4', itemName: 'Latte', category: 'hot_drinks', menuItemId: 'm4' }),
      ],
      baseConfig(),
    );

    const names = grouped.map((g) => g.item.itemName);
    expect(names.slice(0, 2).sort()).toEqual(['Flat White', 'Latte'].sort());
    expect(names.slice(2).sort()).toEqual(['Matcha', 'Matcha Latte'].sort());
    expect(grouped.every((g) => !g.view.isFood)).toBe(true);
  });

  it('groups by milk before syrups within a section', () => {
    const coconut = (id: string, syrup?: string) =>
      line({
        id,
        menuItemId: `mi-${id}`,
        itemName: 'Latte',
        category: 'hot_drinks',
        modifiers: [
          mod({ groupId: 'g-milk', groupName: 'Milks', optionId: 'o-coco', optionName: 'Coconut' }),
          ...(syrup
            ? [
                mod({
                  groupId: 'g-syrup',
                  groupName: 'Syrups',
                  optionId: `o-${syrup}`,
                  optionName: syrup,
                }),
              ]
            : []),
        ],
      });
    const whole = (id: string) =>
      line({
        id,
        menuItemId: `mi-${id}`,
        itemName: 'Latte',
        category: 'hot_drinks',
        modifiers: [
          mod({ groupId: 'g-milk', groupName: 'Milks', optionId: 'o-whole', optionName: 'Whole' }),
        ],
      });

    // Jumbled: whole, coconut+vanilla, whole, coconut, coconut+caramel
    const grouped = groupKdsLines(
      [whole('1'), coconut('2', 'Vanilla'), whole('3'), coconut('4'), coconut('5', 'Caramel')],
      baseConfig(),
    );

    const milks = grouped.map((g) => g.item.modifiers.find((m) => m.groupName === 'Milks')?.optionName);
    // Coconut block then whole block (alpha: coconut < whole), syrups only within milk.
    expect(milks).toEqual(['Coconut', 'Coconut', 'Coconut', 'Whole', 'Whole']);
  });

  it('clusters default whole / house together', () => {
    const defaults = (id: string) =>
      line({
        id,
        menuItemId: 'mi-latte',
        itemName: 'Latte',
        modifiers: [
          mod({
            groupId: 'g-milk',
            groupName: 'Milks',
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
        ],
      });

    const grouped = groupKdsLines([defaults('a'), defaults('b')], baseConfig());
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.quantity).toBe(2);
    expect(grouped[0]!.sourceIds).toEqual(['a', 'b']);
  });

  it('does not merge when notes differ', () => {
    const grouped = groupKdsLines(
      [
        line({ id: 'a', menuItemId: 'mi-latte', itemName: 'Latte', notes: 'extra hot' }),
        line({ id: 'b', menuItemId: 'mi-latte', itemName: 'Latte', notes: null }),
      ],
      baseConfig(),
    );
    expect(grouped).toHaveLength(2);
  });
});
