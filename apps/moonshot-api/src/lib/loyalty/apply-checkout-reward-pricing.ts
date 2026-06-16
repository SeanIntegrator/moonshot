import { ApiErrorCode } from '@moonshot/types';
import type { ResolvedOrderLine } from '../order-modifiers.js';
import { ApiHttpError } from '../http-errors.js';
import { computeFreeDrinkDiscountMinor } from './loyalty-checkout-discount.js';

export function applyRewardDiscountToTotal(params: {
  subtotalMinor: number;
  lines: ResolvedOrderLine[];
  redeemRewardId: string | null | undefined;
}): { totalMinor: number; discountMinor: number } {
  const { subtotalMinor, lines, redeemRewardId } = params;
  if (!redeemRewardId) {
    return { totalMinor: subtotalMinor, discountMinor: 0 };
  }

  const rawDiscount = computeFreeDrinkDiscountMinor(lines);
  if (rawDiscount <= 0) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'Add a drink to use your free-drink reward on this order',
    );
  }

  const discountMinor = Math.min(rawDiscount, subtotalMinor);
  return { totalMinor: subtotalMinor - discountMinor, discountMinor };
}
