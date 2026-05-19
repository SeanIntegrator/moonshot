import type { NormalisedOrder } from '@moonshot/types';
import { pool } from '../../db.js';
import type { OrderRowDb } from '../order-map.js';
import { COMPLETABLE_STATUSES, KDS_OPEN_ORDER_STATUSES, ORDER_SELECT_COLUMNS, UUID_RE } from './order-constants.js';
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
