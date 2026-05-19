import type { LoyaltyFeatureConfig } from '@moonshot/types';

/**
 * Earn rule for punch-card stamps — honours {@link LoyaltyFeatureConfig.doubleStampDays}
 * via weekday names in café timezone (`Monday`, `Tuesday`, … per `en-GB`).
 */
export function stampsEarnedForCompletedOrder(params: {
  loyalty: LoyaltyFeatureConfig;
  cafeTimezone: string;
  completedAt: Date;
}): number {
  const { loyalty, cafeTimezone, completedAt } = params;
  if (!loyalty.doubleStampDays?.length) return 1;
  const weekday = new Intl.DateTimeFormat('en-GB', {
    timeZone: cafeTimezone,
    weekday: 'long',
  }).format(completedAt);
  return loyalty.doubleStampDays.includes(weekday) ? 2 : 1;
}

/** Review prompt counter — null pickup counts as on-time (kitchen-led ETA unknown). */
export function onTimeForReviewPrompt(params: {
  pickupTimeIso: string | null;
  completedAtIso: string | null;
  nowMs?: number;
}): boolean {
  const pickupMs = params.pickupTimeIso ? new Date(params.pickupTimeIso).getTime() : null;
  const completedMs = params.completedAtIso
    ? new Date(params.completedAtIso).getTime()
    : (params.nowMs ?? Date.now());

  if (pickupMs == null || !Number.isFinite(pickupMs)) return true;
  return Number.isFinite(completedMs) && completedMs <= pickupMs + 2 * 60 * 1000;
}
