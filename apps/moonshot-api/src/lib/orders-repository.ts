import type { CreateOrderLineInput, NormalisedOrder, OrderType } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { ApiHttpError } from './http-errors.js';
import { mapOrderItemRow, mapOrderRow, type OrderItemRowDb, type OrderRowDb } from './order-map.js';
import { resolveOrderLinesWithModifiers, type ResolvedOrderLine } from './order-modifiers.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ORDER_TYPES: OrderType[] = ['takeaway', 'eat_in'];

/** Orders visible on KDS board before completion */
export const KDS_OPEN_ORDER_STATUSES = ['confirmed', 'preparing', 'ready'] as const;

const COMPLETABLE_STATUSES = ['confirmed', 'preparing', 'ready'] as const;

function validateLines(lines: CreateOrderLineInput[]): void {
  if (lines.length === 0) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Order must include at least one line item');
  }
  for (const line of lines) {
    if (!line.menuItemId?.trim() || !UUID_RE.test(line.menuItemId)) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Each item requires a valid menuItemId UUID');
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        'Each item requires quantity as a positive integer',
      );
    }
  }
}

export async function fetchOrderWithItems(
  db: typeof pool | PoolClient,
  orderId: string,
  cafeId: string,
): Promise<NormalisedOrder | null> {
  const orderRes = await db.query<OrderRowDb>(
    `SELECT
      id, cafe_id, user_id, pos_order_id, customer_name, notes, total_minor, currency,
      order_type, source, status, payment_status, quoted_pickup_time, pickup_time,
      completed_at, edit_token, parent_order_id, stripe_checkout_session_id,
      created_at, updated_at
    FROM orders
    WHERE id = $1 AND cafe_id = $2`,
    [orderId, cafeId],
  );
  if (orderRes.rows.length === 0) return null;

  const itemsRes = await db.query<OrderItemRowDb>(
    `SELECT id, order_id, menu_item_id, item_name, quantity, unit_price_minor,
            modifiers, allergens, notes, created_at
     FROM order_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId],
  );

  const items = itemsRes.rows.map((r) => mapOrderItemRow(r));
  return mapOrderRow(orderRes.rows[0]!, items);
}

/**
 * Pay-in-store: confirmed + unpaid, prices from menu_items + modifiers.
 */
export async function createGuestPayInStoreOrder(params: {
  cafeId: string;
  userId: string | null;
  customerName: string;
  notes: string | null;
  orderType: OrderType;
  lines: CreateOrderLineInput[];
}): Promise<NormalisedOrder> {
  const { cafeId, userId, customerName, notes, orderType, lines } = params;

  if (!ORDER_TYPES.includes(orderType)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid orderType');
  }

  const trimmedName = customerName.trim();
  if (!trimmedName) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'customerName is required');
  }

  validateLines(lines);

  const { lines: resolvedLines, currency, totalMinor } = await resolveOrderLinesWithModifiers({
    db: pool,
    cafeId,
    lines,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertOrder = await client.query<OrderRowDb>(
      `INSERT INTO orders (
        cafe_id, user_id, customer_name, notes, total_minor, currency,
        order_type, source, status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'app', 'confirmed', 'unpaid')
      RETURNING
        id, cafe_id, user_id, pos_order_id, customer_name, notes, total_minor, currency,
        order_type, source, status, payment_status, quoted_pickup_time, pickup_time,
        completed_at, edit_token, parent_order_id, stripe_checkout_session_id,
        created_at, updated_at`,
      [cafeId, userId, trimmedName, notes, totalMinor, currency, orderType],
    );

    const orderRow = insertOrder.rows[0];
    if (!orderRow) {
      throw new ApiHttpError(500, ApiErrorCode.INTERNAL, 'Failed to create order');
    }

    const orderId = orderRow.id;

    for (const rl of resolvedLines) {
      await client.query(
        `INSERT INTO order_items (
          order_id, menu_item_id, item_name, quantity, unit_price_minor,
          modifiers, allergens, notes
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [
          orderId,
          rl.menuItemId,
          rl.itemName,
          rl.quantity,
          rl.unitPriceMinor,
          JSON.stringify(rl.modifiers),
          [],
          rl.notes,
        ],
      );
    }

    await client.query('COMMIT');

    const full = await fetchOrderWithItems(pool, orderId, cafeId);
    if (!full) {
      throw new ApiHttpError(500, ApiErrorCode.INTERNAL, 'Order created but could not be loaded');
    }
    return full;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Persist a pending unpaid order using already-resolved menu lines (single pricing snapshot).
 */
export async function insertPendingOrderWithResolvedLines(params: {
  cafeId: string;
  userId: string | null;
  customerName: string;
  notes: string | null;
  orderType: OrderType;
  resolvedLines: ResolvedOrderLine[];
  currency: string;
  totalMinor: number;
}): Promise<NormalisedOrder> {
  const { cafeId, userId, customerName, notes, orderType, resolvedLines, currency, totalMinor } =
    params;

  if (!ORDER_TYPES.includes(orderType)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid orderType');
  }

  const trimmedName = customerName.trim();
  if (!trimmedName) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'customerName is required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertOrder = await client.query<OrderRowDb>(
      `INSERT INTO orders (
        cafe_id, user_id, customer_name, notes, total_minor, currency,
        order_type, source, status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'app', 'pending', 'unpaid')
      RETURNING
        id, cafe_id, user_id, pos_order_id, customer_name, notes, total_minor, currency,
        order_type, source, status, payment_status, quoted_pickup_time, pickup_time,
        completed_at, edit_token, parent_order_id, stripe_checkout_session_id,
        created_at, updated_at`,
      [cafeId, userId, trimmedName, notes, totalMinor, currency, orderType],
    );

    const orderRow = insertOrder.rows[0];
    if (!orderRow) {
      throw new ApiHttpError(500, ApiErrorCode.INTERNAL, 'Failed to create order');
    }

    const orderId = orderRow.id;

    for (const rl of resolvedLines) {
      await client.query(
        `INSERT INTO order_items (
          order_id, menu_item_id, item_name, quantity, unit_price_minor,
          modifiers, allergens, notes
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [
          orderId,
          rl.menuItemId,
          rl.itemName,
          rl.quantity,
          rl.unitPriceMinor,
          JSON.stringify(rl.modifiers),
          [],
          rl.notes,
        ],
      );
    }

    await client.query('COMMIT');

    const full = await fetchOrderWithItems(pool, orderId, cafeId);
    if (!full) {
      throw new ApiHttpError(500, ApiErrorCode.INTERNAL, 'Order created but could not be loaded');
    }
    return full;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

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
 * Stripe path: pending + unpaid until Checkout webhook confirms payment.
 */
export async function createPendingOrderForCheckout(params: {
  cafeId: string;
  userId: string | null;
  customerName: string;
  notes: string | null;
  orderType: OrderType;
  lines: CreateOrderLineInput[];
}): Promise<NormalisedOrder> {
  const { cafeId, userId, customerName, notes, orderType, lines } = params;

  if (!ORDER_TYPES.includes(orderType)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid orderType');
  }

  const trimmedName = customerName.trim();
  if (!trimmedName) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'customerName is required');
  }

  validateLines(lines);

  const { lines: resolvedLines, currency, totalMinor } = await resolveOrderLinesWithModifiers({
    db: pool,
    cafeId,
    lines,
  });

  return insertPendingOrderWithResolvedLines({
    cafeId,
    userId,
    customerName,
    notes,
    orderType,
    resolvedLines,
    currency,
    totalMinor,
  });
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
}): Promise<NormalisedOrder | null> {
  const { orderId, cafeId, stripeSessionId, paymentIntentId, amountMinor, currency } = params;

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
       RETURNING
         id, cafe_id, user_id, pos_order_id, customer_name, notes, total_minor, currency,
         order_type, source, status, payment_status, quoted_pickup_time, pickup_time,
         completed_at, edit_token, parent_order_id, stripe_checkout_session_id,
         created_at, updated_at`,
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

    await client.query('COMMIT');
    return fetchOrderWithItems(pool, orderId, cafeId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function findOrderByIdAndCafe(orderId: string, cafeId: string): Promise<NormalisedOrder | null> {
  if (!UUID_RE.test(orderId)) return null;
  return fetchOrderWithItems(pool, orderId, cafeId);
}

export async function listOpenOrdersForKds(cafeId: string): Promise<NormalisedOrder[]> {
  const ordersRes = await pool.query<OrderRowDb>(
    `SELECT
      id, cafe_id, user_id, pos_order_id, customer_name, notes, total_minor, currency,
      order_type, source, status, payment_status, quoted_pickup_time, pickup_time,
      completed_at, edit_token, parent_order_id, stripe_checkout_session_id,
      created_at, updated_at
    FROM orders
    WHERE cafe_id = $1 AND status = ANY($2::text[])
    ORDER BY created_at ASC`,
    [cafeId, [...KDS_OPEN_ORDER_STATUSES]],
  );

  if (ordersRes.rows.length === 0) return [];

  const orderIds = ordersRes.rows.map((r) => r.id);
  const itemsRes = await pool.query<OrderItemRowDb>(
    `SELECT id, order_id, menu_item_id, item_name, quantity, unit_price_minor,
            modifiers, allergens, notes, created_at
     FROM order_items
     WHERE order_id = ANY($1::uuid[])
     ORDER BY order_id, created_at ASC`,
    [orderIds],
  );

  const itemsByOrder = new Map<string, OrderItemRowDb[]>();
  for (const row of itemsRes.rows) {
    const list = itemsByOrder.get(row.order_id) ?? [];
    list.push(row);
    itemsByOrder.set(row.order_id, list);
  }

  return ordersRes.rows.map((row) => {
    const rawItems = itemsByOrder.get(row.id) ?? [];
    return mapOrderRow(
      row,
      rawItems.map((itemRow) => mapOrderItemRow(itemRow)),
    );
  });
}

export async function completeOrderForKds(orderId: string, cafeId: string): Promise<NormalisedOrder | null> {
  if (!UUID_RE.test(orderId)) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upd = await client.query<OrderRowDb>(
      `UPDATE orders
       SET status = 'completed',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND cafe_id = $2 AND status = ANY($3::text[])
       RETURNING
         id, cafe_id, user_id, pos_order_id, customer_name, notes, total_minor, currency,
         order_type, source, status, payment_status, quoted_pickup_time, pickup_time,
         completed_at, edit_token, parent_order_id, stripe_checkout_session_id,
         created_at, updated_at`,
      [orderId, cafeId, [...COMPLETABLE_STATUSES]],
    );

    await client.query('COMMIT');

    if (upd.rows.length === 0) return null;
    return fetchOrderWithItems(pool, orderId, cafeId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
