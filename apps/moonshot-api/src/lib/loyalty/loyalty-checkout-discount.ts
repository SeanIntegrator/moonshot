import { isDrinkMenuCategory } from '@moonshot/types';
import type { ResolvedOrderLine } from '../order-modifiers.js';

/**
 * Free-drink reward: discount equals the highest unit price among drink lines.
 * Clamped by caller to subtotal. Custom sections (ube, pandan, …) count as drinks;
 * food / extras do not.
 */
export function computeFreeDrinkDiscountMinor(lines: ResolvedOrderLine[]): number {
  let max = 0;
  for (const line of lines) {
    if (!isDrinkMenuCategory(line.category)) continue;
    max = Math.max(max, line.unitPriceMinor);
  }
  return max;
}
