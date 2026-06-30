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
import { applyRewardDiscountToTotal } from './loyalty/apply-checkout-reward-pricing.js';
import { getStripeConnectAccountId, isStripeConnectReady } from './payments/cafe-payment-config.js';
import { getStripeOrNull } from './payments/stripe-client.js';
import { createStripeCheckoutSessionDirectCharge } from './payments/stripe-checkout.js';
import { checkoutUrlsForCafe } from './order-checkout-env.js';

/**
 * Single menu resolution snapshot → pending order → Stripe Checkout session → persist `payment_sessions`.
 * Rolls back the pending order if Stripe or DB recording fails.
 * Loyalty rewards are consumed on webhook after payment (not at pending insert).
 */
export async function createStripeCheckoutOrderResponse(params: {
  cafeId: string;
  cafeSlug: string;
  userId: string | null;
  customerName: string;
  notes: string | null | undefined;
  orderType: OrderType;
  lines: CreateOrderLineInput[];
  paymentConfig: Record<string, unknown>;
  redeemRewardId?: string | null;
}): Promise<CreateOrderResponse> {
  const { cafeId, cafeSlug, userId, customerName, notes, orderType, lines, paymentConfig, redeemRewardId } =
    params;

  if (redeemRewardId && !userId) {
    throw new ApiHttpError(
      401,
      ApiErrorCode.UNAUTHORIZED,
      'Sign in to redeem a loyalty reward on this order',
    );
  }

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

  const { lines: resolvedLines, currency, totalMinor: subtotalMinor } = await resolveOrderLinesWithModifiers({
    db: pool,
    cafeId,
    lines,
  });

  const { totalMinor, discountMinor } = applyRewardDiscountToTotal({
    subtotalMinor,
    lines: resolvedLines,
    redeemRewardId,
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
    redeemRewardId: redeemRewardId ?? null,
    consumeReward: false,
  });

  const { successUrl, cancelUrl } = checkoutUrlsForCafe(cafeSlug);

  try {
    const session = await createStripeCheckoutSessionDirectCharge({
      connectedAccountId,
      resolvedLines,
      currency,
      orderId: order.id,
      cafeId,
      successUrl,
      cancelUrl,
      discountMinor,
      redeemRewardId: redeemRewardId ?? null,
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

    const base: CreateOrderResponse = {
      order: orderOut,
      checkoutUrl: session.url,
      discountMinor: discountMinor > 0 ? discountMinor : undefined,
      redeemedRewardId: undefined,
    };

    if (userId != null || !jwtSecret) {
      return base;
    }

    return {
      ...base,
      trackingToken: signTrackOrderJwt({
        orderId: orderOut.id,
        cafeId,
        secret: jwtSecret,
      }),
    };
  } catch (e) {
    await deleteAbandonedPendingOrder(order.id, cafeId);
    throw e;
  }
}
