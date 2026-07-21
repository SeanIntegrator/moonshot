import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODIFIER_CLASSIFICATION,
  deriveLinePrep,
  type KdsConfig,
} from '@moonshot/types';
import type { NormalisedOrderItem } from '@moonshot/types';

function baseConfig(overrides?: Partial<KdsConfig>): KdsConfig {
  return {
    cafeId: 'cafe-1',
    milkColors: {},
    beanBadges: {
      house: { label: 'Ho', bg: '#2d2d2d', text: '#f5f5f5' },
      decaf: { label: 'Dc', bg: '#6b4f2a', text: '#fff' },
      guest: { label: 'Gu', bg: '#1a4d3a', text: '#fff' },
      custom: [],
    },
    modifierClassification: {
      coffeeModifiers: [...DEFAULT_MODIFIER_CLASSIFICATION.coffeeModifiers],
      additions: [...DEFAULT_MODIFIER_CLASSIFICATION.additions],
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
    expect(prep.chips[0]?.shape).toBe('round');
  });
});
