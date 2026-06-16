import type { NormalisedOrder } from '@moonshot/types';
import { pool } from '../../db.js';
import { consumeRewardForOrder } from '../loyalty/consume-reward-for-order.js';
import { ORDER_SELECT_COLUMNS } from './order-constants.js';
import { fetchOrderWithItems } from './order-read.js';
import type { OrderRowDb } from '../order-map.js';

/** Remove a pending checkout draft when Stripe session creation fails or recording the session fails. */
export async function deleteAbandonedPendingOrder(orderId: string, cafeId: string): Promise<void> {
  await pool.query(
    `DELETE FROM orders
     WHERE id = $1 AND cafe_id = $2 AND status = 'pending' AND payment_status = 'unpaid'`,
    [orderId, cafeId],
  );
}

/**
 * Record Checkout session immediately so customers can recover state after redirect.
 */
export async function recordStripeCheckoutSessionForOrder(params: {
  orderId: string;
  cafeId: string;
  sessionId: string;
  paymentIntentId: string | null;
  amountMinor: number;
  currency: string;
}): Promise<void> {
  const { orderId, cafeId, sessionId, paymentIntentId, amountMinor, currency } = params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO payment_sessions (
        order_id, cafe_id, provider, session_id, payment_intent_id, amount_minor, currency, type
      ) VALUES ($1, $2, 'stripe', $3, $4, $5, $6, 'initial')
      ON CONFLICT (session_id) DO NOTHING`,
      [orderId, cafeId, sessionId, paymentIntentId, amountMinor, currency],
    );

    await client.query(
      `UPDATE orders SET stripe_checkout_session_id = $1, updated_at = NOW()
       WHERE id = $2 AND cafe_id = $3 AND status = 'pending' AND payment_status = 'unpaid'`,
      [sessionId, orderId, cafeId],
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function findOrderByStripeCheckoutSessionForCafe(
  sessionId: string,
  cafeId: string,
): Promise<NormalisedOrder | null> {
  const res = await pool.query<{ order_id: string }>(
    `SELECT ps.order_id
     FROM payment_sessions ps
     INNER JOIN orders o ON o.id = ps.order_id AND o.cafe_id = ps.cafe_id
     WHERE ps.session_id = $1 AND ps.cafe_id = $2`,
    [sessionId, cafeId],
  );
  const orderId = res.rows[0]?.order_id;
  if (!orderId) return null;
  return fetchOrderWithItems(pool, orderId, cafeId);
}

/**
 * Webhook: mark pending order paid + confirmed; idempotent if already paid.
 */
export async function confirmOrderPaidFromStripeCheckout(params: {
  orderId: string;
  cafeId: string;
  stripeSessionId: string;
  paymentIntentId: string | null;
  amountMinor: number;
  currency: string;
  redeemRewardId?: string | null;
  userId?: string | null;
}): Promise<NormalisedOrder | null> {
  const { orderId, cafeId, stripeSessionId, paymentIntentId, amountMinor, currency, redeemRewardId, userId } =
    params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await fetchOrderWithItems(client, orderId, cafeId);
    if (!existing) {
      await client.query('ROLLBACK');
      return null;
    }

    if (existing.paymentStatus === 'paid') {
      await client.query('ROLLBACK');
      return existing;
    }

    if (existing.status !== 'pending' || existing.paymentStatus !== 'unpaid') {
      await client.query('ROLLBACK');
      return null;
    }

    if (amountMinor !== existing.totalMinor || currency !== existing.currency) {
      await client.query('ROLLBACK');
      return null;
    }

    const upd = await client.query<OrderRowDb>(
      `UPDATE orders
       SET status = 'confirmed',
           payment_status = 'paid',
           stripe_checkout_session_id = $1,
           updated_at = NOW()
       WHERE id = $2 AND cafe_id = $3 AND status = 'pending' AND payment_status = 'unpaid'
       RETURNING ${ORDER_SELECT_COLUMNS}`,
      [stripeSessionId, orderId, cafeId],
    );

    if (upd.rows.length === 0) {
      await client.query('ROLLBACK');
      return fetchOrderWithItems(pool, orderId, cafeId);
    }

    await client.query(
      `INSERT INTO payment_sessions (
        order_id, cafe_id, provider, session_id, payment_intent_id, amount_minor, currency, type
      ) VALUES ($1, $2, 'stripe', $3, $4, $5, $6, 'initial')
      ON CONFLICT (session_id) DO NOTHING`,
      [orderId, cafeId, stripeSessionId, paymentIntentId, amountMinor, currency],
    );

    if (redeemRewardId && userId) {
      await consumeRewardForOrder({
        client,
        cafeId,
        userId,
        rewardId: redeemRewardId,
        orderId,
      });
    }

    await client.query('COMMIT');
    return fetchOrderWithItems(pool, orderId, cafeId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
