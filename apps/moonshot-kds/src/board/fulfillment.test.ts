import { describe, expect, it } from 'vitest';
import type { NormalisedOrder } from '@moonshot/types';
import {
  orderFulfillmentTypes,
  showHeaderFulfillmentIcons,
  ticketIsMixedFulfillment,
} from './fulfillment.js';

function order(
  partial: Partial<NormalisedOrder> &
    Pick<NormalisedOrder, 'orderType' | 'source'>,
): NormalisedOrder {
  return {
    id: 'o1',
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
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
    detailsPending: false,
    ...partial,
  };
}

describe('orderFulfillmentTypes', () => {
  it('returns order-level type until per-line cups exist', () => {
    expect(orderFulfillmentTypes(order({ orderType: 'eat_in', source: 'pos' }))).toEqual([
      'eat_in',
    ]);
  });
});

describe('ticketIsMixedFulfillment', () => {
  it('is false for homogeneous tickets', () => {
    expect(ticketIsMixedFulfillment(['eat_in'])).toBe(false);
    expect(ticketIsMixedFulfillment(['takeaway'])).toBe(false);
  });

  it('is true when both eat-in and takeaway are present', () => {
    expect(ticketIsMixedFulfillment(['eat_in', 'takeaway'])).toBe(true);
  });
});

describe('showHeaderFulfillmentIcons', () => {
  it('shows icons for POS tickets only', () => {
    expect(showHeaderFulfillmentIcons(order({ orderType: 'takeaway', source: 'pos' }))).toBe(
      true,
    );
    expect(showHeaderFulfillmentIcons(order({ orderType: 'takeaway', source: 'app' }))).toBe(
      false,
    );
  });
});
