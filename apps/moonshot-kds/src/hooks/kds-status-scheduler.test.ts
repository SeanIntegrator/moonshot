import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NormalisedOrder } from '@moonshot/types';
import { createStatusScheduler } from './kds-status-scheduler.js';

function order(partial: Partial<NormalisedOrder> & Pick<NormalisedOrder, 'id'>): NormalisedOrder {
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
    detailsPending: false,
    ...partial,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('createStatusScheduler', () => {
  it('coalesces rapid toggles into one POST of the latest target', async () => {
    vi.useFakeTimers();
    let orders = [order({ id: 'a', status: 'confirmed' })];
    const advance = vi.fn(async (_token: string, _id: string, status: 'confirmed' | 'preparing' | 'ready') => ({
      order: order({ id: 'a', status }),
    }));

    const scheduler = createStatusScheduler({
      getToken: () => 'tok',
      setOrders: (update) => {
        orders = typeof update === 'function' ? update(orders) : update;
      },
      setError: () => undefined,
      onSessionExpired: () => undefined,
      advanceStatus: advance,
    });

    scheduler.schedule('a', 'ready', 'confirmed');
    scheduler.schedule('a', 'confirmed', 'ready');
    expect(orders[0]?.status).toBe('confirmed');
    expect(advance).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(250);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance).toHaveBeenCalledWith('tok', 'a', 'confirmed');
  });

  it('retargets while a POST is in flight and flushes the new target', async () => {
    vi.useFakeTimers();
    let orders = [order({ id: 'a', status: 'confirmed' })];
    let resolveFirst!: (value: { order: NormalisedOrder }) => void;
    const calls: string[] = [];
    const advance = vi.fn(((_token: string, _id: string, status: 'confirmed' | 'preparing' | 'ready') => {
      calls.push(status);
      if (calls.length === 1) {
        return new Promise<{ order: NormalisedOrder }>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve({ order: order({ id: 'a', status }) });
    }) as typeof import('../lib/kds-api.js').kdsAdvanceOrderStatus);

    const scheduler = createStatusScheduler({
      getToken: () => 'tok',
      setOrders: (update) => {
        orders = typeof update === 'function' ? update(orders) : update;
      },
      setError: () => undefined,
      onSessionExpired: () => undefined,
      advanceStatus: advance,
    });

    scheduler.schedule('a', 'ready', 'confirmed');
    await vi.advanceTimersByTimeAsync(250);
    expect(calls).toEqual(['ready']);

    scheduler.schedule('a', 'confirmed', 'ready');
    expect(orders[0]?.status).toBe('confirmed');
    resolveFirst({ order: order({ id: 'a', status: 'ready' }) });
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    expect(calls).toEqual(['ready', 'confirmed']);
    expect(orders[0]?.status).toBe('confirmed');
  });

  it('rolls back optimistic status when the POST fails', async () => {
    vi.useFakeTimers();
    let orders = [order({ id: 'a', status: 'confirmed' })];
    let error: string | null = null;

    const scheduler = createStatusScheduler({
      getToken: () => 'tok',
      setOrders: (update) => {
        orders = typeof update === 'function' ? update(orders) : update;
      },
      setError: (e) => {
        error = e;
      },
      onSessionExpired: () => undefined,
      advanceStatus: async () => {
        throw new Error('nope');
      },
    });

    scheduler.schedule('a', 'ready', 'confirmed');
    expect(orders[0]?.status).toBe('ready');
    await vi.advanceTimersByTimeAsync(250);
    await Promise.resolve();
    await Promise.resolve();

    expect(orders[0]?.status).toBe('confirmed');
    expect(error).toBe('nope');
  });

  it('does not POST when the target already matches current status', async () => {
    vi.useFakeTimers();
    const advance = vi.fn();
    const scheduler = createStatusScheduler({
      getToken: () => 'tok',
      setOrders: () => undefined,
      setError: () => undefined,
      onSessionExpired: () => undefined,
      advanceStatus: advance,
    });
    scheduler.schedule('a', 'confirmed', 'confirmed');
    await vi.advanceTimersByTimeAsync(250);
    expect(advance).not.toHaveBeenCalled();
  });
});
