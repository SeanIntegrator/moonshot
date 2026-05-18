import type { CreateOrderResponse, CreateOrderLineInput, OrderType } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../db.js';
import { ApiHttpError } from './http-errors.js';
import { signTrackOrderJwt } from './customer-socket-token.js';
import {
  deleteAbandonedPendingOrder,
  fetchOrderWithItems,
  insertPendingOrderWithResolvedLines,
  recordStripeCheckoutSessionForOrder,
} from './orders-repository.js';
import { resolveOrderLinesWithModifiers } from './order-modifiers.js';
import { getStripeConnectAccountId, isStripeConnectReady } from './payments/cafe-payment-config.js';
import { getStripeOrNull } from './payments/stripe-client.js';
import { createStripeCheckoutSessionDirectCharge } from './payments/stripe-checkout.js';
import { checkoutUrlsFromEnv } from './order-checkout-env.js';

/**
 * Single menu resolution snapshot → pending order → Stripe Checkout session → persist `payment_sessions`.
 * Rolls back the pending order if Stripe or DB recording fails.
 */
export async function createStripeCheckoutOrderResponse(params: {
  cafeId: string;
  userId: string | null;
  customerName: string;
  notes: string | null | undefined;
  orderType: OrderType;
  lines: CreateOrderLineInput[];
  paymentConfig: Record<string, unknown>;
}): Promise<CreateOrderResponse> {
  const { cafeId, userId, customerName, notes, orderType, lines, paymentConfig } = params;

  if (!getStripeOrNull()) {
    throw new ApiHttpError(
      503,
      ApiErrorCode.CONFIG,
      'Stripe is not configured on this server (STRIPE_API_KEY)',
    );
  }

  if (!isStripeConnectReady(paymentConfig)) {
    throw new ApiHttpError(
      403,
      ApiErrorCode.FORBIDDEN,
      'Online payments are not enabled for this café. Complete Stripe Connect onboarding in the admin app.',
    );
  }

  const connectedAccountId = getStripeConnectAccountId(paymentConfig);
  if (!connectedAccountId) {
    throw new ApiHttpError(
      403,
      ApiErrorCode.CONFIG,
      'Stripe connected account is missing from café configuration.',
    );
  }

  const { lines: resolvedLines, currency, totalMinor } = await resolveOrderLinesWithModifiers({
    db: pool,
    cafeId,
    lines,
  });

  const order = await insertPendingOrderWithResolvedLines({
    cafeId,
    userId,
    customerName,
    notes: notes ?? null,
    orderType,
    resolvedLines,
    currency,
    totalMinor,
  });

  const { successUrl, cancelUrl } = checkoutUrlsFromEnv();

  try {
    const session = await createStripeCheckoutSessionDirectCharge({
      connectedAccountId,
      resolvedLines,
      currency,
      orderId: order.id,
      cafeId,
      successUrl,
      cancelUrl,
    });

    if (!session.url) {
      throw new ApiHttpError(500, ApiErrorCode.INTERNAL, 'Stripe did not return a checkout URL');
    }

    await recordStripeCheckoutSessionForOrder({
      orderId: order.id,
      cafeId,
      sessionId: session.sessionId,
      paymentIntentId: session.paymentIntentId,
      amountMinor: totalMinor,
      currency,
    });

    const refreshed = await fetchOrderWithItems(pool, order.id, cafeId);
    const orderOut = refreshed ?? order;

    const jwtSecret = process.env.JWT_SECRET;

    const data: CreateOrderResponse =
      userId != null || !jwtSecret
        ? { order: orderOut, checkoutUrl: session.url }
        : {
            order: orderOut,
            checkoutUrl: session.url,
            trackingToken: signTrackOrderJwt({
              orderId: orderOut.id,
              cafeId,
              secret: jwtSecret,
            }),
          };

    return data;
  } catch (e) {
    await deleteAbandonedPendingOrder(order.id, cafeId);
    throw e;
  }
}
