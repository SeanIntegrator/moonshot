import { describe, expect, it } from 'vitest';
import type { NormalisedOrder } from '@moonshot/types';
import { mergeLineSelections } from './recent-order-format.js';

function order(
  id: string,
  itemIds: string[],
): NormalisedOrder {
  return {
    id,
    cafeId: 'c1',
    source: 'pos',
    customerName: 'Guest',
    customerId: null,
    items: itemIds.map((itemId) => ({
      id: itemId,
      menuItemId: null,
      itemName: 'Item',
      quantity: 1,
      unitPriceMinor: 0,
      modifiers: [],
      allergens: [],
      notes: null,
      category: null,
    })),
    notes: null,
    orderType: 'takeaway',
    status: 'completed',
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
  };
}

describe('mergeLineSelections', () => {
  it('selects every line on a reset (first open)', () => {
    const a = order('a', ['l1', 'l2']);
    const next = mergeLineSelections(new Map(), [a], true);
    expect([...next.get('a')!]).toEqual(['l1', 'l2']);
  });

  it('keeps existing ticks across refresh and drops stale line ids', () => {
    const prev = new Map([['a', new Set(['l1'])]]);
    const a = order('a', ['l1', 'l3']);
    const b = order('b', ['x']);
    const next = mergeLineSelections(prev, [a, b], false);
    expect([...next.get('a')!]).toEqual(['l1']);
    expect([...next.get('b')!]).toEqual(['x']);
  });
});
