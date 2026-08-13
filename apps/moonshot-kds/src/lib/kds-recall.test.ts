import { describe, expect, it } from 'vitest';
import type { NormalisedOrder } from '@moonshot/types';
import { toOptimisticRecalledOrder, unselectedLineIds } from './kds-recall.js';

function order(partial: Partial<NormalisedOrder> & Pick<NormalisedOrder, 'id'>): NormalisedOrder {
  return {
    cafeId: 'c1',
    source: 'pos',
    customerName: 'Guest',
    customerId: null,
    items: [],
    notes: null,
    orderType: 'takeaway',
    status: 'completed',
    paymentStatus: 'paid',
    totalMinor: 0,
    currency: 'GBP',
    pickup: {
      quotedPickupTime: null,
      pickupTime: null,
      completedAt: '2026-01-01T00:10:00.000Z',
      etaMode: 'auto',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:10:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
    detailsPending: false,
    ...partial,
  };
}

describe('toOptimisticRecalledOrder', () => {
  it('reopens as confirmed and clears completedAt', () => {
    const source = order({ id: 'a' });
    const next = toOptimisticRecalledOrder(source);
    expect(next.status).toBe('confirmed');
    expect(next.pickup.completedAt).toBeNull();
    expect(source.status).toBe('completed');
  });
});

describe('unselectedLineIds', () => {
  it('returns the complement of the selected remake lines', () => {
    const source = order({
      id: 'a',
      items: [
        {
          id: 'l1',
          menuItemId: null,
          itemName: 'Latte',
          quantity: 1,
          unitPriceMinor: 0,
          modifiers: [],
          allergens: [],
          notes: null,
          category: null,
        },
        {
          id: 'l2',
          menuItemId: null,
          itemName: 'Muffin',
          quantity: 1,
          unitPriceMinor: 0,
          modifiers: [],
          allergens: [],
          notes: null,
          category: 'food',
        },
      ],
    });
    expect([...unselectedLineIds(source, ['l1'])]).toEqual(['l2']);
    expect(unselectedLineIds(source, ['l1', 'l2']).size).toBe(0);
  });
});
