import type { NormalisedOrder, OrderStatus } from '@moonshot/types';
import { pool } from '../../db.js';
import type { OrderRowDb } from '../order-map.js';
import {
  COMPLETABLE_STATUSES,
  KDS_OPEN_ORDER_STATUSES,
  ORDER_SELECT_COLUMNS,
  UUID_RE,
} from './order-constants.js';
import { fetchOrderWithItems, normalisedOrdersFromRows } from './order-read.js';

export async function listOpenOrdersForKds(cafeId: string): Promise<NormalisedOrder[]> {
  const ordersRes = await pool.query<OrderRowDb>(
    `SELECT ${ORDER_SELECT_COLUMNS}
     FROM orders
     WHERE cafe_id = $1 AND status = ANY($2::text[])
     ORDER BY created_at ASC`,
    [cafeId, [...KDS_OPEN_ORDER_STATUSES]],
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

/** Allowed forward transitions for KDS advance (not including complete). */
const STATUS_TRANSITIONS: Record<'preparing' | 'ready', OrderStatus[]> = {
  preparing: ['confirmed'],
  ready: ['preparing'],
};

/**
 * Advance an open order to preparing or ready.
 * Returns null when the order is missing / wrong café / invalid transition.
 */
export async function advanceOrderStatusForKds(
  orderId: string,
  cafeId: string,
  nextStatus: 'preparing' | 'ready',
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
