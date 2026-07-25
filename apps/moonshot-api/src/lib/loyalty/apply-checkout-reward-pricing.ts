import { ApiErrorCode } from '@moonshot/types';
import type { ResolvedOrderLine } from '../order-modifiers.js';
import { ApiHttpError } from '../http-errors.js';
import { computeLoyaltyCheckoutDiscountMinor } from './loyalty-checkout-discount.js';

export function applyRewardDiscountToTotal(params: {
  subtotalMinor: number;
  lines: ResolvedOrderLine[];
  redeemRewardId: string | null | undefined;
  /** Required when redeemRewardId is set — loaded from the unredeemed reward row. */
  rewardType?: string | null;
}): { totalMinor: number; discountMinor: number } {
  const { subtotalMinor, lines, redeemRewardId, rewardType } = params;
  if (!redeemRewardId) {
    return { totalMinor: subtotalMinor, discountMinor: 0 };
  }

  if (!rewardType) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid loyalty reward');
  }

  const rawDiscount = computeLoyaltyCheckoutDiscountMinor(rewardType, lines);
  if (rawDiscount <= 0) {
    const message =
      rewardType === 'free_pastry'
        ? 'Add a food item to use your free-pastry reward on this order'
        : 'Add a drink to use your free-drink reward on this order';
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, message);
  }

  const discountMinor = Math.min(rawDiscount, subtotalMinor);
  return { totalMinor: subtotalMinor - discountMinor, discountMinor };
}
