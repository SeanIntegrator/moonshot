import type { NormalisedOrder, OrderType } from '@moonshot/types';

/** Unique fulfillment types on a ticket, eat-in before takeaway. */
export function orderFulfillmentTypes(order: NormalisedOrder): OrderType[] {
  // Later: unique from order.items[].orderType when per-line cups exist.
  return [order.orderType];
}

export function ticketIsMixedFulfillment(types: readonly OrderType[]): boolean {
  return types.includes('eat_in') && types.includes('takeaway');
}

/** POS sit-in / takeaway tickets show cup icons in the header; pickup (order-ahead) does not. */
export function showHeaderFulfillmentIcons(order: NormalisedOrder): boolean {
  return order.source === 'pos';
}
