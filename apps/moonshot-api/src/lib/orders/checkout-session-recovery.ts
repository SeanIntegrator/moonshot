import type { NormalisedOrder } from '@moonshot/types';
import { findCafeById } from '../cafes-repository.js';
import { getStripeConnectAccountId } from '../payments/cafe-payment-config.js';
import { retrieveStripeCheckoutSession } from '../payments/stripe-checkout.js';
import { getStripeOrNull } from '../payments/stripe-client.js';
import { recomputePickupEtasForCafe } from '../pickup-eta.js';
import { pool } from '../../db.js';
import { emitKdsServerToClient } from '../../realtime/kds-events.js';
import {
  confirmOrderPaidFromStripeCheckout,
  findOrderByStripeCheckoutSessionForCafe,
} from './order-checkout.js';

function paymentIntentIdFromSession(
  paymentIntent: string | { id: string } | null | undefined,
): string | null {
  if (typeof paymentIntent === 'string') return paymentIntent;
  if (paymentIntent && typeof paymentIntent === 'object' && 'id' in paymentIntent) {
    return paymentIntent.id;
  }
  return null;
}

/**
 * Checkout return recovery: resolve order by Stripe session, then confirm from Stripe
 * when the webhook has not run yet (common locally or on redirect race).
 *
 * Flow: payment_sessions lookup → if still pending, retrieve session on connected
 * account → confirmOrderPaidFromStripeCheckout (same as webhook) → KDS emit only
 * when this call newly transitions unpaid → paid.
 */
export async function recoverOrderFromStripeCheckoutSession(params: {
  sessionId: string;
  cafeId: string;
}): Promise<NormalisedOrder | null> {
  const { sessionId, cafeId } = params;
  const order = await findOrderByStripeCheckoutSessionForCafe(sessionId, cafeId);
  if (!order) return null;

  if (order.paymentStatus === 'paid' && order.status !== 'pending') {
    return order;
  }

  const stripe = getStripeOrNull();
  if (!stripe) return order;

  const cafe = await findCafeById(cafeId);
  if (!cafe) return order;

  const connectedAccountId = getStripeConnectAccountId(cafe.paymentConfig);
  if (!connectedAccountId) return order;

  let session;
  try {
    session = await retrieveStripeCheckoutSession({ sessionId, connectedAccountId });
  } catch (e) {
    console.warn('[checkout.recover] Stripe session retrieve failed', { sessionId, cafeId, err: e });
    return order;
  }

  if (session.payment_status !== 'paid' || session.amount_total == null) {
    return order;
  }

  const metaOrderId = session.metadata?.moonshot_order_id;
  const metaCafeId = session.metadata?.moonshot_cafe_id;
  if (metaOrderId !== order.id || metaCafeId !== cafeId) {
    console.warn('[checkout.recover] Stripe session metadata mismatch', {
      sessionId,
      cafeId,
      metaOrderId,
      metaCafeId,
      orderId: order.id,
    });
    return order;
  }

  const wasUnpaid = order.paymentStatus !== 'paid';
  const confirmed = await confirmOrderPaidFromStripeCheckout({
    orderId: order.id,
    cafeId,
    stripeSessionId: session.id,
    paymentIntentId: paymentIntentIdFromSession(session.payment_intent),
    amountMinor: session.amount_total,
    currency: (session.currency ?? order.currency).toUpperCase(),
    redeemRewardId: session.metadata?.moonshot_redeem_reward_id ?? null,
    userId: order.customerId,
  });

  if (!confirmed) return order;

  // Webhook may have confirmed already; emit KDS only when we were the path that paid.
  if (wasUnpaid && confirmed.paymentStatus === 'paid') {
    emitKdsServerToClient(cafeId, { type: 'kds:order:new', order: confirmed });
    await recomputePickupEtasForCafe({
      db: pool,
      cafeId,
      kdsConfig: cafe.kdsConfig,
    });
  }

  return confirmed;
}
