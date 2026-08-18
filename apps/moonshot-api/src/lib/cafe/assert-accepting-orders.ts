import { cafeOpenStatusForCafe, pickupDelayFitsLastSlot } from '@moonshot/domain';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../http-errors.js';
import type { ResolvedCafe } from '../resolved-cafe.js';

export function assertCafeAcceptingOrders(cafe: ResolvedCafe, now: Date = new Date()): void {
  const status = cafeOpenStatusForCafe(cafe, now);
  if (status.isOpen) return;
  if (status.reason === 'paused') {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'This café is taking a short break');
  }
  if (status.reason === 'buffer') {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Last orders have been taken for this session');
  }
  throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'This café is currently closed');
}

export function assertPickupDelayWithinLastSlot(
  cafe: ResolvedCafe,
  pickupDelayMinutes: number | null | undefined,
  now: Date = new Date(),
): void {
  if (pickupDelayMinutes == null || pickupDelayMinutes === 0) return;
  const ok = pickupDelayFitsLastSlot({
    delayMinutes: pickupDelayMinutes,
    now,
    timezone: cafe.timezone,
    hours: cafe.hours,
    overrides: cafe.hoursOverrides,
    lastOrderBufferMinutes: cafe.lastOrderBufferMinutes,
  });
  if (!ok) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'That pickup time is after last orders for this session',
    );
  }
}
