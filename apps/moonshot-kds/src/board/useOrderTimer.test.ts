import { describe, expect, it } from 'vitest';
import { KDS_WALK_UP_SLA_MS } from '@moonshot/domain';
import type { NormalisedOrder } from '@moonshot/types';
import { computeOrderTimer, orderDeadlineMs } from './useOrderTimer.js';

function order(
  partial: Partial<NormalisedOrder> &
    Pick<NormalisedOrder, 'id' | 'createdAt' | 'orderType' | 'source'>,
): NormalisedOrder {
  return {
    cafeId: 'c1',
    customerName: 'Guest',
    customerId: null,
    items: [],
    notes: null,
    status: 'confirmed',
    paymentStatus: 'paid',
    totalMinor: 0,
    currency: 'GBP',
    pickup: {
      quotedPickupTime: null,
      pickupTime: null,
      completedAt: null,
      etaMode: 'auto',
    },
    updatedAt: partial.createdAt,
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
    detailsPending: false,
    ...partial,
  };
}

describe('orderDeadlineMs', () => {
  const created = '2026-01-01T12:00:00.000Z';
  const createdMs = Date.parse(created);

  it('uses createdAt + 4m for sit-in and POS takeaway', () => {
    const sitIn = order({
      id: 'a',
      createdAt: created,
      orderType: 'eat_in',
      source: 'pos',
    });
    expect(orderDeadlineMs(sitIn, 'sit_in')).toBe(createdMs + KDS_WALK_UP_SLA_MS);
  });

  it('uses pickupTime for pickup tickets', () => {
    const pickupAt = '2026-01-01T12:10:00.000Z';
    const pickup = order({
      id: 'a',
      createdAt: created,
      orderType: 'takeaway',
      source: 'app',
      pickup: {
        quotedPickupTime: pickupAt,
        pickupTime: pickupAt,
        completedAt: null,
        etaMode: 'auto',
      },
    });
    expect(orderDeadlineMs(pickup, 'pickup')).toBe(Date.parse(pickupAt));
  });

  it('uses the locked walk-up SLA on a recalled ticket even when createdAt is old', () => {
    const sla = '2026-01-01T15:04:00.000Z';
    const recalled = order({
      id: 'a',
      createdAt: created,
      orderType: 'eat_in',
      source: 'pos',
      pickup: {
        quotedPickupTime: null,
        pickupTime: sla,
        completedAt: null,
        etaMode: 'manual_override',
      },
    });
    expect(orderDeadlineMs(recalled, 'sit_in')).toBe(Date.parse(sla));
  });
});

describe('computeOrderTimer', () => {
  it('does not mark a just-recalled ticket past due', () => {
    const now = Date.parse('2026-01-01T15:00:00.000Z');
    const recalled = order({
      id: 'a',
      createdAt: '2026-01-01T12:00:00.000Z',
      orderType: 'takeaway',
      source: 'pos',
      pickup: {
        quotedPickupTime: null,
        pickupTime: new Date(now + KDS_WALK_UP_SLA_MS).toISOString(),
        completedAt: null,
        etaMode: 'manual_override',
      },
    });
    const timer = computeOrderTimer(recalled, now, null);
    expect(timer.pastDue).toBe(false);
    expect(timer.tone).toBe('green');
  });
});
