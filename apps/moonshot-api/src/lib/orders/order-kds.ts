import type { NormalisedOrder, OrderStatus } from '@moonshot/types';
import { walkUpSlaDeadlineIso } from '@moonshot/domain';
import { pool } from '../../db.js';
import type { OrderRowDb } from '../order-map.js';
import {
  COMPLETABLE_STATUSES,
  KDS_OPEN_MAX_AGE_HOURS,
  KDS_OPEN_ORDER_STATUSES,
  ORDER_SELECT_COLUMNS,
  UUID_RE,
} from './order-constants.js';
import { expireStaleOpenOrders } from './order-expire-stale.js';
import { fetchOrderWithItems, normalisedOrdersFromRows } from './order-read.js';

export async function listOpenOrdersForKds(cafeId: string): Promise<NormalisedOrder[]> {
  // Persist the same age cut as the list filter so customer apps and ETA stay in sync.
  await expireStaleOpenOrders({ cafeId });

  const ordersRes = await pool.query<OrderRowDb>(
    `SELECT ${ORDER_SELECT_COLUMNS}
     FROM orders
     WHERE cafe_id = $1 AND status = ANY($2::text[])
       AND created_at > NOW() - ($3 * INTERVAL '1 hour')
     ORDER BY created_at ASC`,
    [cafeId, [...KDS_OPEN_ORDER_STATUSES], KDS_OPEN_MAX_AGE_HOURS],
  );

  return normalisedOrdersFromRows(pool, ordersRes.rows);
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
       RETURNING ${ORDER_SELECT_COLUMNS}`,
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

const RECENT_COMPLETED_DEFAULT_LIMIT = 20;

/**
 * Recently completed orders for the KDS Recent orders dialog (newest first).
 */
export async function listRecentCompletedOrdersForKds(
  cafeId: string,
  limit = RECENT_COMPLETED_DEFAULT_LIMIT,
): Promise<NormalisedOrder[]> {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 50);
  const ordersRes = await pool.query<OrderRowDb>(
    `SELECT ${ORDER_SELECT_COLUMNS}
     FROM orders
     WHERE cafe_id = $1 AND status = 'completed'
     ORDER BY completed_at DESC NULLS LAST, updated_at DESC
     LIMIT $2`,
    [cafeId, safeLimit],
  );

  return normalisedOrdersFromRows(pool, ordersRes.rows);
}

/**
 * Reopen a specific completed order as `confirmed` (just-placed on KDS).
 * Returns null when the order is missing, wrong café, or not completed.
 */
export async function recallCompletedOrderForKds(
  orderId: string,
  cafeId: string,
): Promise<NormalisedOrder | null> {
  if (!UUID_RE.test(orderId)) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upd = await client.query<OrderRowDb>(
      `UPDATE orders
       SET status = 'confirmed',
           completed_at = NULL,
           pickup_time = $3::timestamptz,
           eta_mode = 'manual_override',
           updated_at = NOW()
       WHERE id = $1 AND cafe_id = $2 AND status = 'completed'
       RETURNING ${ORDER_SELECT_COLUMNS}`,
      [orderId, cafeId, walkUpSlaDeadlineIso()],
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

/**
 * Reopen the café's most recently completed order as `confirmed` (just-placed on KDS).
 * Returns null when no completed order exists for the café.
 */
export async function recallLastCompletedOrderForKds(
  cafeId: string,
): Promise<NormalisedOrder | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upd = await client.query<OrderRowDb>(
      `UPDATE orders
       SET status = 'confirmed',
           completed_at = NULL,
           pickup_time = $3::timestamptz,
           eta_mode = 'manual_override',
           updated_at = NOW()
       WHERE id = (
         SELECT id
         FROM orders
         WHERE cafe_id = $1 AND status = 'completed'
           AND completed_at > NOW() - ($2 * INTERVAL '1 hour')
         ORDER BY completed_at DESC NULLS LAST, updated_at DESC
         LIMIT 1
       )
         AND status = 'completed'
       RETURNING ${ORDER_SELECT_COLUMNS}`,
      [cafeId, KDS_OPEN_MAX_AGE_HOURS, walkUpSlaDeadlineIso()],
    );

    await client.query('COMMIT');

    if (upd.rows.length === 0) return null;
    return fetchOrderWithItems(pool, upd.rows[0]!.id, cafeId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Allowed KDS status transitions (complete is separate). */
const STATUS_TRANSITIONS: Record<'confirmed' | 'preparing' | 'ready', OrderStatus[]> = {
  // Flow skips preparing: confirmed → ready when all lines made.
  preparing: ['confirmed'],
  ready: ['confirmed', 'preparing'],
  // Demote when barista un-crosses a line after ready.
  confirmed: ['ready'],
};

/**
 * Advance or demote an open order status for KDS.
 * Returns null when the order is missing / wrong café / invalid transition.
 */
export async function advanceOrderStatusForKds(
  orderId: string,
  cafeId: string,
  nextStatus: 'confirmed' | 'preparing' | 'ready',
): Promise<NormalisedOrder | null> {
  if (!UUID_RE.test(orderId)) return null;
  const fromStatuses = STATUS_TRANSITIONS[nextStatus];

  const upd = await pool.query<OrderRowDb>(
    `UPDATE orders
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2 AND cafe_id = $3 AND status = ANY($4::text[])
     RETURNING ${ORDER_SELECT_COLUMNS}`,
    [nextStatus, orderId, cafeId, fromStatuses],
  );

  if (upd.rows.length === 0) return null;
  return fetchOrderWithItems(pool, orderId, cafeId);
}

/**
 * Barista stretch: set pickup_time and mark eta_mode = manual_override.
 * Returns null when the order is not open on this café.
 */
export async function stretchOrderEtaForKds(
  orderId: string,
  cafeId: string,
  pickupTimeIso: string,
): Promise<NormalisedOrder | null> {
  if (!UUID_RE.test(orderId)) return null;
  const pickupMs = Date.parse(pickupTimeIso);
  if (!Number.isFinite(pickupMs)) return null;

  const upd = await pool.query<OrderRowDb>(
    `UPDATE orders
     SET pickup_time = $1::timestamptz,
         quoted_pickup_time = COALESCE(quoted_pickup_time, $1::timestamptz),
         eta_mode = 'manual_override',
         updated_at = NOW()
     WHERE id = $2 AND cafe_id = $3 AND status = ANY($4::text[])
     RETURNING ${ORDER_SELECT_COLUMNS}`,
    [new Date(pickupMs).toISOString(), orderId, cafeId, [...KDS_OPEN_ORDER_STATUSES]],
  );

  if (upd.rows.length === 0) return null;
  return fetchOrderWithItems(pool, orderId, cafeId);
}
