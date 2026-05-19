import type { IsoDateTime, NormalisedOrder } from './order.js';

/** Signed-in customer: active queue + recent history */
export interface CustomerOrdersListResponse {
  active: NormalisedOrder[];
  recent: NormalisedOrder[];
}

export interface PickupEstimateResponse {
  pickupTime: IsoDateTime;
  /** Whole minutes from now until estimated pickup */
  minutesFromNow: number;
}

/** Customer-initiated cancel — Stripe refund handled in a later phase */
export interface CancelOrderResponse {
  order: NormalisedOrder;
  /** True when order was paid online but no refund API ran yet */
  refundPending: boolean;
}
