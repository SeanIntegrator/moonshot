import type { MenuCategory } from '@moonshot/types';
import type { ResolvedOrderLine } from '../order-modifiers.js';

const DRINK_CATEGORIES = new Set<MenuCategory>(['hot_drinks', 'cold_drinks']);

/**
 * Free-drink reward: discount equals the highest unit price among drink lines.
 * Clamped by caller to subtotal.
 */
export function computeFreeDrinkDiscountMinor(lines: ResolvedOrderLine[]): number {
  let max = 0;
  for (const line of lines) {
    if (!DRINK_CATEGORIES.has(line.category)) continue;
    max = Math.max(max, line.unitPriceMinor);
  }
  return max;
}
