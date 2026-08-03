import type { NormalisedOrder } from '@moonshot/types';
import type { PoolClient } from 'pg';
import { pool as defaultPool } from '../../db.js';
import { mapOrderItemRow, mapOrderRow, type OrderItemRowDb, type OrderRowDb } from '../order-map.js';
import { ORDER_ITEM_SELECT_COLUMNS, ORDER_SELECT_COLUMNS, UUID_RE } from './order-constants.js';

type Executor = typeof defaultPool | PoolClient;

export async function fetchOrderWithItems(
  db: Executor,
  orderId: string,
  cafeId: string,
): Promise<NormalisedOrder | null> {
  const orderRes = await db.query<OrderRowDb>(
    `SELECT ${ORDER_SELECT_COLUMNS} FROM orders WHERE id = $1 AND cafe_id = $2`,
    [orderId, cafeId],
  );
  if (orderRes.rows.length === 0) return null;

  const itemsRes = await db.query<OrderItemRowDb>(
    `SELECT ${ORDER_ITEM_SELECT_COLUMNS}
     FROM order_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId],
  );

  const items = itemsRes.rows.map((r) => mapOrderItemRow(r));
  return mapOrderRow(orderRes.rows[0]!, items);
}

export async function findOrderByIdAndCafe(
  orderId: string,
  cafeId: string,
  db: Executor = defaultPool,
): Promise<NormalisedOrder | null> {
  if (!UUID_RE.test(orderId)) return null;
  return fetchOrderWithItems(db, orderId, cafeId);
}

/** Batch-load items for a set of order rows and map to {@link NormalisedOrder}. */
export async function normalisedOrdersFromRows(
  db: Executor,
  ordersRows: OrderRowDb[],
): Promise<NormalisedOrder[]> {
  if (ordersRows.length === 0) return [];

  const orderIds = ordersRows.map((r) => r.id);
  const itemsRes = await db.query<OrderItemRowDb>(
    `SELECT ${ORDER_ITEM_SELECT_COLUMNS}
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

  return ordersRows.map((row) => {
    const rawItems = itemsByOrder.get(row.id) ?? [];
    return mapOrderRow(
      row,
      rawItems.map((itemRow) => mapOrderItemRow(itemRow)),
    );
  });
}
