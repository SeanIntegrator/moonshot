import { describe, expect, it } from 'vitest';
import type { NormalisedOrder } from '@moonshot/types';
import { applyKdsEvent, mergeRemoteOrders, sortOrders } from './orders-store.js';

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

const noPending = { isProtected: () => false, hasPending: () => false };

describe('sortOrders', () => {
  it('returns the same array when already sorted', () => {
    const a = order({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' });
    const b = order({ id: 'b', createdAt: '2026-01-01T00:01:00.000Z' });
    const prev = [a, b];
    expect(sortOrders(prev)).toBe(prev);
  });
});

describe('applyKdsEvent', () => {
  it('inserts a new order and sorts', () => {
    const older = order({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' });
    const newer = order({ id: 'b', createdAt: '2026-01-01T00:02:00.000Z' });
    const next = applyKdsEvent([newer], { type: 'kds:order:new', order: older }, noPending);
    expect(next.map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('returns prev when inserting an identical snapshot', () => {
    const existing = order({ id: 'a', updatedAt: 't1' });
    const prev = [existing];
    const next = applyKdsEvent(prev, { type: 'kds:order:new', order: { ...existing } }, noPending);
    expect(next).toBe(prev);
  });

  it('applies an item quantity change even when updatedAt is unchanged', () => {
    const item = {
      id: 'line-1',
      menuItemId: null,
      itemName: 'Latte',
      quantity: 1,
      unitPriceMinor: 350,
      modifiers: [],
      allergens: [],
      notes: null,
      category: null,
    };
    const existing = order({ id: 'a', updatedAt: 't1', items: [item] });
    const prev = [existing];
    const next = applyKdsEvent(
      prev,
      {
        type: 'kds:order:updated',
        order: { ...existing, items: [{ ...item, quantity: 2 }] },
      },
      noPending,
    );
    expect(next).not.toBe(prev);
    expect(next[0]?.items[0]?.quantity).toBe(2);
  });

  it('removes an order and no-ops when already gone', () => {
    const a = order({ id: 'a' });
    const prev = [a];
    expect(applyKdsEvent(prev, { type: 'kds:order:removed', orderId: 'a' }, noPending)).toEqual([]);
    expect(applyKdsEvent(prev, { type: 'kds:order:removed', orderId: 'missing' }, noPending)).toBe(
      prev,
    );
  });

  it('does not resurrect a dismissing card', () => {
    const a = order({ id: 'a', status: 'confirmed' });
    const prev = [a];
    const next = applyKdsEvent(
      prev,
      { type: 'kds:order:updated', order: { ...a, status: 'ready', updatedAt: 'later' } },
      { isProtected: (id) => id === 'a', hasPending: () => false },
    );
    expect(next).toBe(prev);
  });

  it('preserves optimistic status while pending', () => {
    const a = order({ id: 'a', status: 'ready' });
    const remote = order({ id: 'a', status: 'confirmed', updatedAt: 'later' });
    const next = applyKdsEvent(
      [a],
      { type: 'kds:order:updated', order: remote },
      { isProtected: () => false, hasPending: (id) => id === 'a' },
    );
    expect(next[0]?.status).toBe('ready');
    expect(next[0]?.updatedAt).toBe('later');
  });

  it('returns prev when eta updates do not change pickupTime', () => {
    const a = order({
      id: 'a',
      pickup: {
        quotedPickupTime: null,
        pickupTime: '2026-01-01T00:10:00.000Z',
        completedAt: null,
        etaMode: 'auto',
      },
    });
    const prev = [a];
    const next = applyKdsEvent(
      prev,
      {
        type: 'kds:eta:updated',
        updates: [{ orderId: 'a', pickupTime: '2026-01-01T00:10:00.000Z' }],
      },
      noPending,
    );
    expect(next).toBe(prev);
  });

  it('patches pickupTime when eta changes', () => {
    const a = order({ id: 'a' });
    const next = applyKdsEvent(
      [a],
      {
        type: 'kds:eta:updated',
        updates: [{ orderId: 'a', pickupTime: '2026-01-01T00:12:00.000Z' }],
      },
      noPending,
    );
    expect(next[0]?.pickup.pickupTime).toBe('2026-01-01T00:12:00.000Z');
    expect(next).not.toBe([a]);
  });
});

describe('mergeRemoteOrders', () => {
  it('returns prev when the remote snapshot matches the board', () => {
    const a = order({ id: 'a', updatedAt: 't1' });
    const prev = [a];
    const next = mergeRemoteOrders(prev, [{ ...a }], noPending);
    expect(next).toBe(prev);
  });

  it('replaces the board when a remote line quantity changes at the same updatedAt', () => {
    const item = {
      id: 'line-1',
      menuItemId: null,
      itemName: 'Latte',
      quantity: 1,
      unitPriceMinor: 350,
      modifiers: [],
      allergens: [],
      notes: null,
      category: null,
    };
    const local = order({ id: 'a', updatedAt: 't1', items: [item] });
    const remote = order({
      id: 'a',
      updatedAt: 't1',
      items: [{ ...item, quantity: 2 }],
    });
    const prev = [local];
    const next = mergeRemoteOrders(prev, [remote], noPending);
    expect(next).not.toBe(prev);
    expect(next[0]?.items[0]?.quantity).toBe(2);
  });

  it('keeps dismissing cards that the server no longer returns', () => {
    const a = order({ id: 'a' });
    const b = order({ id: 'b', createdAt: '2026-01-01T00:01:00.000Z' });
    const next = mergeRemoteOrders([a, b], [b], {
      isProtected: (id) => id === 'a',
      hasPending: () => false,
    });
    expect(next.map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('preserves optimistic status during pending updates', () => {
    const local = order({ id: 'a', status: 'ready' });
    const remote = order({ id: 'a', status: 'confirmed', updatedAt: 'later' });
    const next = mergeRemoteOrders([local], [remote], {
      isProtected: () => false,
      hasPending: (id) => id === 'a',
    });
    expect(next[0]?.status).toBe('ready');
    expect(next[0]?.updatedAt).toBe('later');
  });

  it('keeps a pending-recall order omitted from the remote snapshot', () => {
    const pending = order({ id: 'a', status: 'confirmed' });
    const b = order({ id: 'b', createdAt: '2026-01-01T00:01:00.000Z' });
    const next = mergeRemoteOrders([pending, b], [b], {
      isProtected: (id) => id === 'a',
      hasPending: () => false,
    });
    expect(next.map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('drops a previously pending-recall order once protection clears', () => {
    const pending = order({ id: 'a' });
    const b = order({ id: 'b', createdAt: '2026-01-01T00:01:00.000Z' });
    const next = mergeRemoteOrders([pending, b], [b], noPending);
    expect(next.map((o) => o.id)).toEqual(['b']);
  });
});
