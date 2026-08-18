import { describe, expect, it } from 'vitest';
import { ApiHttpError } from '../http-errors.js';
import { assertCafeAcceptingOrders, assertPickupDelayWithinLastSlot } from './assert-accepting-orders.js';
import { defaultWeekdayCafeHours } from '@moonshot/domain';
import type { ResolvedCafe } from '../resolved-cafe.js';

function cafe(partial: Partial<ResolvedCafe> = {}): ResolvedCafe {
  return {
    cafeId: 'cafe-1',
    slug: 'demo',
    name: 'Demo',
    posProvider: 'manual',
    posConfig: {},
    paymentProvider: 'stripe',
    paymentConfig: {},
    features: {
      loyalty: null,
      events: null,
      promotions: null,
      order_ahead: {
        enabled: true,
        paymentProvider: 'pay_in_store',
        pickupTimeEnabled: true,
        defaultPickupMinutes: 10,
        maxPickupMinutes: 60,
        notesEnabled: true,
      },
      review_nudge: null,
      saved_orders: null,
      whatsapp_ordering: null,
    },
    themeId: 'minimal',
    themeOverrides: {},
    kdsConfig: {} as ResolvedCafe['kdsConfig'],
    timezone: 'UTC',
    hours: defaultWeekdayCafeHours(),
    pausedUntil: null,
    lastOrderBufferMinutes: 20,
    hoursOverrides: [],
    ownerFeedbackEmail: null,
    ...partial,
  };
}

describe('assertCafeAcceptingOrders', () => {
  it('allows an in-hours order', () => {
    expect(() =>
      assertCafeAcceptingOrders(cafe(), new Date('2026-08-11T10:00:00.000Z')),
    ).not.toThrow();
  });

  it('rejects a pause', () => {
    expect(() =>
      assertCafeAcceptingOrders(
        cafe({ pausedUntil: '2026-08-11T12:00:00.000Z' }),
        new Date('2026-08-11T10:00:00.000Z'),
      ),
    ).toThrow(ApiHttpError);
  });

  it('rejects inside the last-order buffer', () => {
    expect(() =>
      assertCafeAcceptingOrders(cafe(), new Date('2026-08-11T15:45:00.000Z')),
    ).toThrow(ApiHttpError);
  });
});

describe('assertPickupDelayWithinLastSlot', () => {
  it('rejects a delay that lands after the last slot', () => {
    expect(() =>
      assertPickupDelayWithinLastSlot(cafe(), 40, new Date('2026-08-11T15:20:00.000Z')),
    ).toThrow(ApiHttpError);
  });

  it('allows ASAP while still before the last slot', () => {
    expect(() =>
      assertPickupDelayWithinLastSlot(cafe(), 0, new Date('2026-08-11T10:00:00.000Z')),
    ).not.toThrow();
  });
});
