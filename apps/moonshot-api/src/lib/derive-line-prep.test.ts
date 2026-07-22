import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODIFIER_CLASSIFICATION,
  deriveFlowLine,
  deriveLinePrep,
  type KdsConfig,
} from '@moonshot/types';
import type { NormalisedOrderItem } from '@moonshot/types';

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
    audio: { newOrderSound: null, volume: 80 },
    display: {
      showCustomerNameInHeader: true,
      showPickupTime: true,
      showOrderSource: true,
    },
    eta: { basePrepMinutes: 8, perItemMinutes: 2 },
    ...overrides,
  };
}

describe('deriveLinePrep', () => {
  it('marks milks as square chips with milk colour and syrups as round', () => {
    const item: NormalisedOrderItem = {
      id: 'line-1',
      menuItemId: null,
      itemName: 'Flat White',
      quantity: 1,
      unitPriceMinor: 350,
      allergens: [],
      notes: null,
      modifiers: [
        {
          groupId: 'g1',
          groupName: 'Milks',
          optionId: 'o1',
          optionName: 'Oat',
          priceMinor: 40,
          colorHex: '#e8dcc8',
          chipLabel: 'Oa',
        },
        {
          groupId: 'g2',
          groupName: 'Syrups',
          optionId: 'o2',
          optionName: 'Vanilla',
          priceMinor: 50,
          colorHex: '#f5e6c8',
          chipLabel: 'Va',
        },
      ],
    };

    const prep = deriveLinePrep(item, baseConfig());
    expect(prep.milkColorHex).toBe('#e8dcc8');
    expect(prep.chips).toEqual([
      { label: 'Oa', shape: 'square', colorHex: '#e8dcc8' },
      { label: 'Va', shape: 'round', colorHex: '#f5e6c8' },
    ]);
  });

  it('detects decaf bean badge from option name', () => {
    const item: NormalisedOrderItem = {
      id: 'line-1',
      menuItemId: null,
      itemName: 'Espresso',
      quantity: 1,
      unitPriceMinor: 250,
      allergens: [],
      notes: null,
      modifiers: [
        {
          groupId: 'g1',
          groupName: 'Beans',
          optionId: 'o1',
          optionName: 'Decaf',
          priceMinor: 0,
          chipLabel: 'Dc',
        },
      ],
    };

    const prep = deriveLinePrep(item, baseConfig());
    expect(prep.beanBadgeKey).toBe('decaf');
    // Beans are role groups — not chips in prep derivation.
    expect(prep.chips).toEqual([]);
  });
});

describe('deriveFlowLine', () => {
  it('hides default milk/shot/bean and shows only non-default syrups', () => {
    const item: NormalisedOrderItem = {
      id: 'line-1',
      menuItemId: null,
      itemName: 'Latte',
      quantity: 1,
      unitPriceMinor: 350,
      category: 'hot_drinks',
      allergens: [],
      notes: null,
      modifiers: [
        {
          groupId: 'shots',
          groupName: 'Shots',
          optionId: 'double',
          optionName: 'Double',
          priceMinor: 0,
          isDefault: true,
        },
        {
          groupId: 'beans',
          groupName: 'Beans',
          optionId: 'house',
          optionName: 'House',
          priceMinor: 0,
          isDefault: true,
        },
        {
          groupId: 'milks',
          groupName: 'Milks',
          optionId: 'whole',
          optionName: 'Whole',
          priceMinor: 0,
          colorHex: '#f5f0e8',
          isDefault: true,
        },
        {
          groupId: 'syrups',
          groupName: 'Syrups',
          optionId: 'caramel',
          optionName: 'Caramel',
          priceMinor: 50,
          colorHex: '#c68642',
        },
      ],
    };

    const view = deriveFlowLine(item, baseConfig());
    expect(view.isFood).toBe(false);
    expect(view.shotLabel).toBeNull();
    expect(view.beanKey).toBe('house');
    expect(view.beanAccent).toBe('#e8a33d');
    expect(view.milk).toBeNull();
    expect(view.syrups).toEqual([{ label: 'Caramel', colorHex: '#c68642' }]);
  });

  it('builds Single · Decaf shot label with decaf accent', () => {
    const item: NormalisedOrderItem = {
      id: 'line-1',
      menuItemId: null,
      itemName: 'Latte',
      quantity: 1,
      unitPriceMinor: 350,
      category: 'hot_drinks',
      allergens: [],
      notes: null,
      modifiers: [
        {
          groupId: 'shots',
          groupName: 'Shots',
          optionId: 'single',
          optionName: 'Single',
          priceMinor: 0,
          isDefault: false,
        },
        {
          groupId: 'beans',
          groupName: 'Beans',
          optionId: 'decaf',
          optionName: 'Decaf',
          priceMinor: 0,
          isDefault: false,
        },
      ],
    };

    const view = deriveFlowLine(item, baseConfig());
    expect(view.shotLabel).toBe('Single · Decaf');
    expect(view.beanKey).toBe('decaf');
    expect(view.beanAccent).toBe('#7aa2d6');
  });

  it('shows Triple for non-default shots with house bean colour', () => {
    const item: NormalisedOrderItem = {
      id: 'line-1',
      menuItemId: null,
      itemName: 'Latte',
      quantity: 1,
      unitPriceMinor: 350,
      category: 'hot_drinks',
      allergens: [],
      notes: null,
      modifiers: [
        {
          groupId: 'shots',
          groupName: 'Shots',
          optionId: 'triple',
          optionName: 'Triple',
          priceMinor: 50,
          isDefault: false,
        },
      ],
    };

    const view = deriveFlowLine(item, baseConfig());
    expect(view.shotLabel).toBe('Triple');
    expect(view.beanKey).toBe('house');
    expect(view.beanAccent).toBe('#e8a33d');
  });

  it('attaches non-default temperature/texture to milk chip', () => {
    const item: NormalisedOrderItem = {
      id: 'line-1',
      menuItemId: null,
      itemName: 'Cappuccino',
      quantity: 1,
      unitPriceMinor: 350,
      category: 'hot_drinks',
      allergens: [],
      notes: null,
      modifiers: [
        {
          groupId: 'milks',
          groupName: 'Milks',
          optionId: 'oat',
          optionName: 'Oat',
          priceMinor: 40,
          colorHex: '#e8dcc8',
          isDefault: false,
        },
        {
          groupId: 'temp',
          groupName: 'Milk Temperature',
          optionId: 'warm',
          optionName: 'Warm',
          priceMinor: 0,
          isDefault: false,
        },
        {
          groupId: 'tex',
          groupName: 'Milk Texture',
          optionId: 'dry',
          optionName: 'Dry',
          priceMinor: 0,
          isDefault: false,
        },
      ],
    };

    const view = deriveFlowLine(item, baseConfig());
    expect(view.milk).toEqual({
      name: 'Oat',
      bg: '#e8dcc8',
      text: '#1a1a1a',
      temperature: 'Warm',
      texture: 'Dry',
    });
  });

  it('shows non-default size and marks food by category', () => {
    const drink: NormalisedOrderItem = {
      id: 'line-1',
      menuItemId: null,
      itemName: 'Cappuccino',
      quantity: 1,
      unitPriceMinor: 400,
      category: 'hot_drinks',
      allergens: [],
      notes: null,
      modifiers: [
        {
          groupId: '__item_size__',
          groupName: 'Size',
          optionId: 'large',
          optionName: 'Large',
          priceMinor: 400,
          isSize: true,
          isDefault: false,
        },
      ],
    };
    expect(deriveFlowLine(drink, baseConfig()).sizeLabel).toBe('Large');

    const food: NormalisedOrderItem = {
      id: 'line-2',
      menuItemId: null,
      itemName: 'Croissant',
      quantity: 1,
      unitPriceMinor: 300,
      category: 'food',
      allergens: ['cereals_containing_gluten'],
      notes: 'warm please',
      modifiers: [],
    };
    const foodView = deriveFlowLine(food, baseConfig());
    expect(foodView.isFood).toBe(true);
    expect(foodView.allergens).toEqual(['cereals_containing_gluten']);
    expect(foodView.notes).toBe('warm please');
  });
});
