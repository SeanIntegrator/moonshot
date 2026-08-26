/**
 * Auto-expire open orders that have aged past the KDS board window.
 * Age is measured from `board_opened_at` (place time, or recall time after a remake).
 * Never-completed tickets become `cancelled` with `cancel_reason = auto_expire`
 * so order-ahead and KDS stay in sync (KDS already hid them via list filter).
 */
import type { NormalisedOrder, OrderCancelReason } from '@moonshot/types';
import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db.js';
import type { OrderRowDb } from '../order-map.js';
import {
  CUSTOMER_ACTIVE_STATUSES,
  KDS_OPEN_MAX_AGE_HOURS,
  ORDER_SELECT_COLUMNS,
} from './order-constants.js';
import {
  notifyOrderCancelled,
  recomputePickupEtasAfterOrderChange,
} from './order-lifecycle-notify.js';
import { normalisedOrdersFromRows } from './order-read.js';

export type ExpireStaleOpenOrdersResult = {
  expired: number;
  byCafe: Record<string, number>;
  orders: NormalisedOrder[];
};

type Db = Pool | PoolClient;

/**
 * Cancel active orders whose `board_opened_at` is older than {@link KDS_OPEN_MAX_AGE_HOURS}.
 * Optional `cafeId` scopes the sweep (KDS list); omit for cron.
 * Do not call from customer routes — JWTs are not café-bound.
 * Recall resets `board_opened_at` so remakes get a fresh window without rewriting place time.
 */
export async function expireStaleOpenOrders(params?: {
  db?: Db;
  cafeId?: string;
  maxAgeHours?: number;
}): Promise<ExpireStaleOpenOrdersResult> {
  const db = params?.db ?? pool;
  const maxAgeHours = params?.maxAgeHours ?? KDS_OPEN_MAX_AGE_HOURS;
  const cafeId = params?.cafeId;

  const sql = cafeId
    ? `UPDATE orders
       SET status = 'cancelled',
           cancel_reason = $4,
           updated_at = NOW()
       WHERE cafe_id = $1
         AND status = ANY($2::text[])
         AND board_opened_at <= NOW() - ($3 * INTERVAL '1 hour')
       RETURNING ${ORDER_SELECT_COLUMNS}`
    : `UPDATE orders
       SET status = 'cancelled',
           cancel_reason = $3,
           updated_at = NOW()
       WHERE status = ANY($1::text[])
         AND board_opened_at <= NOW() - ($2 * INTERVAL '1 hour')
       RETURNING ${ORDER_SELECT_COLUMNS}`;

  const reason: OrderCancelReason = 'auto_expire';
  const result = cafeId
    ? await db.query<OrderRowDb>(sql, [
        cafeId,
        [...CUSTOMER_ACTIVE_STATUSES],
        maxAgeHours,
        reason,
      ])
    : await db.query<OrderRowDb>(sql, [[...CUSTOMER_ACTIVE_STATUSES], maxAgeHours, reason]);

  if (result.rows.length === 0) {
    return { expired: 0, byCafe: {}, orders: [] };
  }

  const orders = await normalisedOrdersFromRows(db, result.rows);
  const byCafe: Record<string, number> = {};
  for (const order of orders) {
    byCafe[order.cafeId] = (byCafe[order.cafeId] ?? 0) + 1;
    notifyOrderCancelled({ cafeId: order.cafeId, order });
  }

  // One ETA recompute per affected café (after all cancels for that café).
  for (const id of Object.keys(byCafe)) {
    await recomputePickupEtasAfterOrderChange({
      db: db as Pool,
      cafeId: id,
      swallowErrors: true,
      logTag: 'orders.expire-stale',
    });
  }

  return { expired: orders.length, byCafe, orders };
}
