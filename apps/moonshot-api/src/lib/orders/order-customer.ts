import type { NormalisedOrder } from '@moonshot/types';
import { pool } from '../../db.js';
import type { OrderRowDb } from '../order-map.js';
import {
  CUSTOMER_ACTIVE_STATUSES,
  CUSTOMER_CANCELLABLE_STATUSES,
  CUSTOMER_TERMINAL_STATUSES,
  ORDER_SELECT_COLUMNS,
  UUID_RE,
} from './order-constants.js';
import { fetchOrderWithItems, normalisedOrdersFromRows } from './order-read.js';

export async function listCustomerOrdersForUser(params: {
  cafeId: string;
  userId: string;
}): Promise<{ active: NormalisedOrder[]; recent: NormalisedOrder[] }> {
  const { cafeId, userId } = params;

  const activeRes = await pool.query<OrderRowDb>(
    `SELECT ${ORDER_SELECT_COLUMNS}
     FROM orders
     WHERE cafe_id = $1 AND user_id = $2 AND status = ANY($3::text[])
     ORDER BY created_at DESC`,
    [cafeId, userId, [...CUSTOMER_ACTIVE_STATUSES]],
  );

  const recentRes = await pool.query<OrderRowDb>(
    `SELECT ${ORDER_SELECT_COLUMNS}
     FROM orders
     WHERE cafe_id = $1 AND user_id = $2 AND status = ANY($3::text[])
     ORDER BY created_at DESC
     LIMIT 10`,
    [cafeId, userId, [...CUSTOMER_TERMINAL_STATUSES]],
  );

  const [active, recent] = await Promise.all([
    normalisedOrdersFromRows(pool, activeRes.rows),
    normalisedOrdersFromRows(pool, recentRes.rows),
  ]);

  return { active, recent };
}

export type CancelOrderDbResult =
  | { kind: 'cancelled'; order: NormalisedOrder }
  | { kind: 'already_cancelled'; order: NormalisedOrder }
  | { kind: 'not_found' }
  | { kind: 'not_cancellable'; order: NormalisedOrder };

export async function cancelOrderAtCafe(orderId: string, cafeId: string): Promise<CancelOrderDbResult> {
  if (!UUID_RE.test(orderId)) return { kind: 'not_found' };

  const existing = await fetchOrderWithItems(pool, orderId, cafeId);
  if (!existing) return { kind: 'not_found' };

  if (existing.status === 'cancelled') {
    return { kind: 'already_cancelled', order: existing };
  }

  if (existing.status === 'completed') {
    return { kind: 'not_cancellable', order: existing };
  }

  if (!(CUSTOMER_CANCELLABLE_STATUSES as readonly string[]).includes(existing.status)) {
    return { kind: 'not_cancellable', order: existing };
  }

  const upd = await pool.query<{ id: string }>(
    `UPDATE orders
     SET status = 'cancelled',
         cancel_reason = 'customer',
         updated_at = NOW()
     WHERE id = $1 AND cafe_id = $2 AND status = ANY($3::text[])
     RETURNING id`,
    [orderId, cafeId, [...CUSTOMER_CANCELLABLE_STATUSES]],
  );

  if (upd.rows.length === 0) {
    const again = await fetchOrderWithItems(pool, orderId, cafeId);
    if (!again) return { kind: 'not_found' };
    if (again.status === 'cancelled') return { kind: 'already_cancelled', order: again };
    return { kind: 'not_cancellable', order: again };
  }

  const order = await fetchOrderWithItems(pool, orderId, cafeId);
  if (!order) return { kind: 'not_found' };
  return { kind: 'cancelled', order };
}
