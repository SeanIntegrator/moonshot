/**
 * Barrel re-export for order persistence. Implementation lives under `./orders/`
 * split by concern (read, create, checkout, KDS, customer).
 */
export {
  KDS_OPEN_ORDER_STATUSES,
  ORDER_SELECT_COLUMNS,
  UUID_RE,
} from './orders/order-constants.js';

export { fetchOrderWithItems, findOrderByIdAndCafe } from './orders/order-read.js';

export {
  createGuestPayInStoreOrder,
  createPendingOrderForCheckout,
  insertPendingOrderWithResolvedLines,
} from './orders/order-create.js';

export {
  confirmOrderPaidFromStripeCheckout,
  deleteAbandonedPendingOrder,
  findOrderByStripeCheckoutSessionForCafe,
  recordStripeCheckoutSessionForOrder,
} from './orders/order-checkout.js';

export { recoverOrderFromStripeCheckoutSession } from './orders/checkout-session-recovery.js';

export { completeOrderForKds, listOpenOrdersForKds } from './orders/order-kds.js';

export {
  cancelOrderAtCafe,
  listCustomerOrdersForUser,
  type CancelOrderDbResult,
} from './orders/order-customer.js';
