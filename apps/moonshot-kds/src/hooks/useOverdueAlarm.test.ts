import { describe, expect, it } from 'vitest';
import type { KdsConfig, NormalisedOrder } from '@moonshot/types';
import { DEFAULT_KDS_AUDIO } from '@moonshot/domain';
import { countOverdueTickets, decideOverdueAlarm } from './useOverdueAlarm.js';

function order(
  partial: Partial<NormalisedOrder> & Pick<NormalisedOrder, 'id' | 'createdAt'>,
): NormalisedOrder {
  return {
    cafeId: 'c1',
    source: 'pos',
    customerName: 'Guest',
    customerId: null,
    items: [],
    notes: null,
    orderType: 'takeaway',
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

const config = { audio: { ...DEFAULT_KDS_AUDIO } } as KdsConfig;

describe('decideOverdueAlarm', () => {
  it('fires on the empty-to-non-empty edge', () => {
    expect(
      decideOverdueAlarm({
        overdueCount: 1,
        previousCount: 0,
        lastFiredAtMs: null,
        nowMs: 10_000,
        repeatSeconds: 60,
      }),
    ).toBe('fire');
  });

  it('repeats after overdueRepeatSeconds while tickets remain red', () => {
    expect(
      decideOverdueAlarm({
        overdueCount: 2,
        previousCount: 1,
        lastFiredAtMs: 10_000,
        nowMs: 70_000,
        repeatSeconds: 60,
      }),
    ).toBe('fire');
  });

  it('waits when the repeat interval has not elapsed', () => {
    expect(
      decideOverdueAlarm({
        overdueCount: 1,
        previousCount: 1,
        lastFiredAtMs: 10_000,
        nowMs: 40_000,
        repeatSeconds: 60,
      }),
    ).toBe('wait');
  });

  it('does not repeat when overdueRepeatSeconds is 0', () => {
    expect(
      decideOverdueAlarm({
        overdueCount: 1,
        previousCount: 1,
        lastFiredAtMs: 10_000,
        nowMs: 90_000,
        repeatSeconds: 0,
      }),
    ).toBe('wait');
  });

  it('idles when the board has no overdue tickets', () => {
    expect(
      decideOverdueAlarm({
        overdueCount: 0,
        previousCount: 2,
        lastFiredAtMs: 10_000,
        nowMs: 70_000,
        repeatSeconds: 60,
      }),
    ).toBe('idle');
  });
});

describe('countOverdueTickets', () => {
  const now = Date.parse('2026-01-01T00:10:00.000Z');

  it('counts past-due confirmed tickets and skips ready or dismissing ones', () => {
    const overdue = order({
      id: 'late',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'confirmed',
    });
    const ready = order({
      id: 'ready',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'ready',
    });
    const dismissing = order({
      id: 'gone',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'confirmed',
    });
    const fresh = order({
      id: 'fresh',
      createdAt: '2026-01-01T00:09:00.000Z',
      status: 'confirmed',
    });
    expect(
      countOverdueTickets(
        [overdue, ready, dismissing, fresh],
        new Set(['gone']),
        now,
        config,
      ),
    ).toBe(1);
  });
});
