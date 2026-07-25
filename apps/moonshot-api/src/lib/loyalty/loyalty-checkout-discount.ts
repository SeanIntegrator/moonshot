import {
  computeLoyaltyRewardDiscountMinor,
  type LoyaltyDiscountLine,
} from '@moonshot/types';
import type { ResolvedOrderLine } from '../order-modifiers.js';

function toDiscountLines(lines: ResolvedOrderLine[]): LoyaltyDiscountLine[] {
  return lines.map((line) => ({
    category: line.category,
    unitPriceMinor: line.unitPriceMinor,
  }));
}

/**
 * Loyalty reward discount for checkout — cheapest matching unit price.
 * free_coffee → drinks (incl. custom sections); free_pastry → food.
 */
export function computeLoyaltyCheckoutDiscountMinor(
  rewardType: string,
  lines: ResolvedOrderLine[],
): number {
  return computeLoyaltyRewardDiscountMinor(rewardType, toDiscountLines(lines));
}

/** @deprecated Prefer computeLoyaltyCheckoutDiscountMinor with reward type. */
export function computeFreeDrinkDiscountMinor(lines: ResolvedOrderLine[]): number {
  return computeLoyaltyCheckoutDiscountMinor('free_coffee', lines);
}
