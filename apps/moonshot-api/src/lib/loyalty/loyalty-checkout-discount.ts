import { computeLoyaltyRewardDiscountMinor, type LoyaltyDiscountLine } from '@moonshot/domain';
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
  foodSectionKeys?: readonly string[] | null,
): number {
  return computeLoyaltyRewardDiscountMinor(rewardType, toDiscountLines(lines), foodSectionKeys);
}

/** @deprecated Prefer computeLoyaltyCheckoutDiscountMinor with reward type. */
export function computeFreeDrinkDiscountMinor(
  lines: ResolvedOrderLine[],
  foodSectionKeys?: readonly string[] | null,
): number {
  return computeLoyaltyCheckoutDiscountMinor('free_coffee', lines, foodSectionKeys);
}
