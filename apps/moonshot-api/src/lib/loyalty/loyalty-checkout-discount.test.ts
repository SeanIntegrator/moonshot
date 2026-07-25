import { describe, expect, it } from 'vitest';
import type { ResolvedOrderLine } from '../order-modifiers.js';
import {
  computeFreeDrinkDiscountMinor,
  computeLoyaltyCheckoutDiscountMinor,
} from './loyalty-checkout-discount.js';
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

describe('computeLoyaltyCheckoutDiscountMinor', () => {
  it('returns cheapest drink unit price including custom sections', () => {
    const discount = computeLoyaltyCheckoutDiscountMinor('free_coffee', [
      line('hot_drinks', 340),
      line('ube', 420),
      line('food', 280),
    ]);
    expect(discount).toBe(340);
  });

  it('returns 0 for free_coffee when no drinks', () => {
    expect(computeLoyaltyCheckoutDiscountMinor('free_coffee', [line('food', 500)])).toBe(0);
  });

  it('returns cheapest food unit for free_pastry', () => {
    expect(
      computeLoyaltyCheckoutDiscountMinor('free_pastry', [
        line('hot_drinks', 340),
        line('food', 280),
        line('food', 190),
      ]),
    ).toBe(190);
  });

  it('returns 0 for free_pastry when drinks only', () => {
    expect(computeLoyaltyCheckoutDiscountMinor('free_pastry', [line('hot_drinks', 340)])).toBe(0);
  });
});

describe('computeFreeDrinkDiscountMinor', () => {
  it('aliases free_coffee cheapest discount', () => {
    expect(
      computeFreeDrinkDiscountMinor([line('hot_drinks', 340), line('ube', 420)]),
    ).toBe(340);
  });
});

describe('applyRewardDiscountToTotal', () => {
  it('clamps discount to subtotal', () => {
    const result = applyRewardDiscountToTotal({
      subtotalMinor: 200,
      lines: [line('hot_drinks', 340)],
      redeemRewardId: 'reward-1',
      rewardType: 'free_coffee',
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

  it('rejects free_coffee on food-only basket', () => {
    expect(() =>
      applyRewardDiscountToTotal({
        subtotalMinor: 500,
        lines: [line('food', 500)],
        redeemRewardId: 'reward-1',
        rewardType: 'free_coffee',
      }),
    ).toThrow(/drink/i);
  });

  it('rejects free_pastry on drinks-only basket', () => {
    expect(() =>
      applyRewardDiscountToTotal({
        subtotalMinor: 500,
        lines: [line('hot_drinks', 340)],
        redeemRewardId: 'reward-1',
        rewardType: 'free_pastry',
      }),
    ).toThrow(/pastry|food/i);
  });
});
