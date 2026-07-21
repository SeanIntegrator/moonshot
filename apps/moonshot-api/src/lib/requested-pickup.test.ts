import { describe, expect, it } from 'vitest';
import {
  applyPickupNotBeforeFloor,
  resolveRequestedPickupNotBefore,
} from './requested-pickup.js';
import type { OrderAheadFeatureConfig } from '@moonshot/types';
import { ApiHttpError } from './http-errors.js';

const OA: OrderAheadFeatureConfig = {
  enabled: true,
  paymentProvider: 'pay_in_store',
  pickupTimeEnabled: true,
  defaultPickupMinutes: 10,
  maxPickupMinutes: 60,
  notesEnabled: true,
};

describe('applyPickupNotBeforeFloor', () => {
  it('returns fifo when no floor', () => {
    expect(applyPickupNotBeforeFloor(1_000, null)).toBe(1_000);
  });

  it('raises eta to not-before when later than fifo', () => {
    expect(applyPickupNotBeforeFloor(1_000, 5_000)).toBe(5_000);
  });

  it('keeps fifo when later than not-before', () => {
    expect(applyPickupNotBeforeFloor(9_000, 5_000)).toBe(9_000);
  });
});

describe('resolveRequestedPickupNotBefore', () => {
  const nowMs = Date.parse('2026-07-21T12:00:00.000Z');

  it('returns null for ASAP / omitted', () => {
    expect(resolveRequestedPickupNotBefore({ pickupDelayMinutes: null, orderAhead: OA })).toBeNull();
    expect(resolveRequestedPickupNotBefore({ pickupDelayMinutes: 0, orderAhead: OA })).toBeNull();
    expect(
      resolveRequestedPickupNotBefore({ pickupDelayMinutes: undefined, orderAhead: OA }),
    ).toBeNull();
  });

  it('builds not-before from delay', () => {
    const d = resolveRequestedPickupNotBefore({
      pickupDelayMinutes: 30,
      orderAhead: OA,
      nowMs,
    });
    expect(d?.toISOString()).toBe('2026-07-21T12:30:00.000Z');
  });

  it('rejects when pickup scheduling disabled', () => {
    expect(() =>
      resolveRequestedPickupNotBefore({
        pickupDelayMinutes: 10,
        orderAhead: { ...OA, pickupTimeEnabled: false },
        nowMs,
      }),
    ).toThrow(ApiHttpError);
  });

  it('rejects above maxPickupMinutes', () => {
    expect(() =>
      resolveRequestedPickupNotBefore({
        pickupDelayMinutes: 90,
        orderAhead: OA,
        nowMs,
      }),
    ).toThrow(ApiHttpError);
  });
});
