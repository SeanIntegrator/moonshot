import type { OrderAheadFeatureConfig } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from './http-errors.js';

/**
 * Resolve customer pickup delay into an absolute not-before timestamp (or null for ASAP).
 * When pickup scheduling is disabled, any non-zero delay is rejected.
 */
export function resolveRequestedPickupNotBefore(params: {
  pickupDelayMinutes: number | null | undefined;
  orderAhead: OrderAheadFeatureConfig | null | undefined;
  nowMs?: number;
}): Date | null {
  const delay = params.pickupDelayMinutes;
  if (delay == null || delay === 0) return null;

  if (!Number.isInteger(delay) || delay < 0) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'pickupDelayMinutes must be a non-negative integer',
    );
  }

  const oa = params.orderAhead;
  if (!oa?.pickupTimeEnabled) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'Pickup time selection is not enabled for this café',
    );
  }

  const max = Number.isFinite(oa.maxPickupMinutes) ? oa.maxPickupMinutes : 60;
  if (delay > max) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      `pickupDelayMinutes must be at most ${max}`,
    );
  }

  const nowMs = params.nowMs ?? Date.now();
  return new Date(nowMs + delay * 60_000);
}

/** Live ETA = max(FIFO estimate, customer not-before floor). */
export function applyPickupNotBeforeFloor(
  fifoMs: number,
  requestedNotBeforeMs: number | null,
): number {
  if (requestedNotBeforeMs == null) return fifoMs;
  return Math.max(fifoMs, requestedNotBeforeMs);
}
