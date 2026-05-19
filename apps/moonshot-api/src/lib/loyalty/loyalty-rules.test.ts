import type { LoyaltyFeatureConfig } from '@moonshot/types';
import { describe, expect, it } from 'vitest';
import { onTimeForReviewPrompt, stampsEarnedForCompletedOrder } from './loyalty-rules.js';

const baseLoyalty: LoyaltyFeatureConfig = {
  enabled: true,
  stampsPerReward: 10,
  rewardDescription: 'Free drink',
  doubleStampDays: [],
};

describe('stampsEarnedForCompletedOrder', () => {
  it('returns 1 when doubleStampDays is empty', () => {
    expect(
      stampsEarnedForCompletedOrder({
        loyalty: baseLoyalty,
        cafeTimezone: 'Europe/London',
        completedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    ).toBe(1);
  });

  it('returns 2 on configured double-stamp weekday in café timezone', () => {
    /* 2026-05-18 is a Monday in Europe/London */
    expect(
      stampsEarnedForCompletedOrder({
        loyalty: { ...baseLoyalty, doubleStampDays: ['Monday'] },
        cafeTimezone: 'Europe/London',
        completedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    ).toBe(2);
  });

  it('uses café timezone, not UTC, when picking the weekday', () => {
    /*
     * 2026-05-18T23:30Z is two different weekdays depending on the zone:
     *   - Pacific/Auckland (UTC+12) → 2026-05-19 11:30 → Tuesday
     *   - Pacific/Honolulu (UTC-10) → 2026-05-18 13:30 → Monday
     * With doubleStampDays: ['Tuesday'] only Auckland should earn the bonus.
     */
    const completedAt = new Date('2026-05-18T23:30:00.000Z');
    expect(
      stampsEarnedForCompletedOrder({
        loyalty: { ...baseLoyalty, doubleStampDays: ['Tuesday'] },
        cafeTimezone: 'Pacific/Auckland',
        completedAt,
      }),
    ).toBe(2);
    expect(
      stampsEarnedForCompletedOrder({
        loyalty: { ...baseLoyalty, doubleStampDays: ['Tuesday'] },
        cafeTimezone: 'Pacific/Honolulu',
        completedAt,
      }),
    ).toBe(1);
  });
});

describe('onTimeForReviewPrompt', () => {
  it('treats unknown pickup time as on-time (kitchen-led ETA)', () => {
    expect(
      onTimeForReviewPrompt({
        pickupTimeIso: null,
        completedAtIso: '2026-05-18T12:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('on-time when completion is within the two minute grace window', () => {
    expect(
      onTimeForReviewPrompt({
        pickupTimeIso: '2026-05-18T12:00:00.000Z',
        completedAtIso: '2026-05-18T12:01:59.000Z',
      }),
    ).toBe(true);
  });

  it('late when completion is past the grace window', () => {
    expect(
      onTimeForReviewPrompt({
        pickupTimeIso: '2026-05-18T12:00:00.000Z',
        completedAtIso: '2026-05-18T12:02:01.000Z',
      }),
    ).toBe(false);
  });
});
