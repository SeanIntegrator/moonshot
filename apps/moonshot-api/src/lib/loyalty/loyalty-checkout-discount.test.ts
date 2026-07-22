import { describe, expect, it } from 'vitest';
import type { ResolvedOrderLine } from '../order-modifiers.js';
import { computeFreeDrinkDiscountMinor } from './loyalty-checkout-discount.js';
import { applyRewardDiscountToTotal } from './apply-checkout-reward-pricing.js';

function line(category: ResolvedOrderLine['category'], unitPriceMinor: number): ResolvedOrderLine {
  return {
    menuItemId: 'id',
    itemName: 'Test',
    category,
    unitPriceMinor,
    quantity: 1,
    notes: null,
    currency: 'GBP',
    modifiers: [],
    allergens: [],
  };
}

describe('computeFreeDrinkDiscountMinor', () => {
  it('returns highest drink unit price including custom sections', () => {
    const discount = computeFreeDrinkDiscountMinor([
      line('hot_drinks', 340),
      line('ube', 420),
      line('food', 280),
    ]);
    expect(discount).toBe(420);
  });

  it('returns 0 when no drinks', () => {
    expect(computeFreeDrinkDiscountMinor([line('food', 500)])).toBe(0);
  });
});

describe('applyRewardDiscountToTotal', () => {
  it('clamps discount to subtotal', () => {
    const result = applyRewardDiscountToTotal({
      subtotalMinor: 200,
      lines: [line('hot_drinks', 340)],
      redeemRewardId: 'reward-1',
    });
    expect(result.discountMinor).toBe(200);
    expect(result.totalMinor).toBe(0);
  });

  it('passes through when no reward', () => {
    const result = applyRewardDiscountToTotal({
      subtotalMinor: 500,
      lines: [line('hot_drinks', 340)],
      redeemRewardId: null,
    });
    expect(result).toEqual({ totalMinor: 500, discountMinor: 0 });
  });
});
