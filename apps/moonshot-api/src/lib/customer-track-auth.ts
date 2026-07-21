import type { Pool } from 'pg';
import { classifyCustomerSocketToken } from './customer-socket-token.js';
import { UUID_RE } from './orders/order-constants.js';

export type SubscribeAuthorizeResult = { ok: true } | { ok: false; message: string };

/**
 * Validates `customer:subscribe` credentials: guest tracking JWT (order must exist, guest-only)
 * or customer session JWT (order must belong to user).
 */
export async function authorizeCustomerSubscribe(params: {
  pool: Pool;
  jwtSecret: string;
  subscribeOrderId: string;
  authToken: string;
}): Promise<SubscribeAuthorizeResult> {
  const { pool, jwtSecret, subscribeOrderId, authToken } = params;

  const trimmedOrder = subscribeOrderId.trim();
  if (!UUID_RE.test(trimmedOrder)) {
    return { ok: false, message: 'Invalid orderId' };
  }

  const auth = authToken.trim();
  if (!auth) {
    return { ok: false, message: 'authToken required' };
  }

  const classified = classifyCustomerSocketToken(auth, jwtSecret);
  if (classified.kind === 'invalid') {
    return { ok: false, message: 'Invalid or expired token' };
  }

  if (classified.kind === 'track_order') {
    const { orderId, cafeId } = classified.claims;
    if (orderId !== trimmedOrder) {
      return { ok: false, message: 'orderId does not match token' };
    }
    if (!UUID_RE.test(cafeId)) {
      return { ok: false, message: 'Invalid cafe in token' };
    }
    const res = await pool.query<{ user_id: string | null }>(
      `SELECT user_id FROM orders WHERE id = $1 AND cafe_id = $2`,
      [trimmedOrder, cafeId],
    );
    if (res.rows.length === 0) {
      return { ok: false, message: 'Order not found' };
    }
    if (res.rows[0]!.user_id != null) {
      return { ok: false, message: 'Use session token for this order' };
    }
    return { ok: true };
  }

  const res = await pool.query<{ user_id: string | null }>(
    `SELECT user_id FROM orders WHERE id = $1`,
    [trimmedOrder],
  );
  if (res.rows.length === 0) {
    return { ok: false, message: 'Order not found' };
  }
  const owner = res.rows[0]!.user_id;
  if (owner == null) {
    return { ok: false, message: 'Use tracking token for guest orders' };
  }
  if (owner !== classified.userId) {
    return { ok: false, message: 'Forbidden' };
  }
  return { ok: true };
}
