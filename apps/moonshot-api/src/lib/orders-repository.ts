import type { CreateOrderLineInput, NormalisedOrder, OrderType } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { ApiHttpError } from './http-errors.js';
import { mapOrderItemRow, mapOrderRow, type OrderItemRowDb, type OrderRowDb } from './order-map.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ORDER_TYPES: OrderType[] = ['takeaway', 'eat_in'];

/** Orders visible on KDS board before completion (Phase 2 guest flow). */
export const KDS_OPEN_ORDER_STATUSES = ['confirmed', 'preparing', 'ready'] as const;

const COMPLETABLE_STATUSES = ['confirmed', 'preparing', 'ready'] as const;

type MenuItemPriceRow = {
  id: string;
  name: string;
  price_minor: number;
  currency: string;
};

function assertModifiersEmpty(lines: CreateOrderLineInput[]): void {
  for (const line of lines) {
    if (line.modifiers != null && line.modifiers.length > 0) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        'Modifiers are not supported yet; omit modifiers or send an empty array.',
      );
    }
  }
}

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

async function fetchOrderWithItems(
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
 * Guest pay-in-store: confirmed + unpaid, prices from menu_items.
 */
export async function createGuestPayInStoreOrder(params: {
  cafeId: string;
  customerName: string;
  notes: string | null;
  orderType: OrderType;
  lines: CreateOrderLineInput[];
}): Promise<NormalisedOrder> {
  const { cafeId, customerName, notes, orderType, lines } = params;

  if (!ORDER_TYPES.includes(orderType)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid orderType');
  }

  const trimmedName = customerName.trim();
  if (!trimmedName) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'customerName is required');
  }

  validateLines(lines);
  assertModifiersEmpty(lines);

  const ids = [...new Set(lines.map((l) => l.menuItemId))];

  const menuRes = await pool.query<MenuItemPriceRow>(
    `SELECT id, name, price_minor, currency
     FROM menu_items
     WHERE cafe_id = $1 AND id = ANY($2::uuid[]) AND is_available = TRUE`,
    [cafeId, ids],
  );

  const byId = new Map(menuRes.rows.map((r) => [r.id, r]));
  if (byId.size !== ids.length) {
    throw new ApiHttpError(
      404,
      ApiErrorCode.NOT_FOUND,
      'One or more menu items were not found or are unavailable for this café',
    );
  }

  let currency: string | null = null;
  let totalMinor = 0;

  const resolvedLines: Array<{
    menuItemId: string;
    itemName: string;
    unitPriceMinor: number;
    quantity: number;
    notes: string | null;
    currency: string;
  }> = [];

  for (const line of lines) {
    const row = byId.get(line.menuItemId)!;
    if (currency == null) currency = row.currency;
    if (row.currency !== currency) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        'All line items must use the same currency for this order',
      );
    }
    totalMinor += row.price_minor * line.quantity;
    resolvedLines.push({
      menuItemId: line.menuItemId,
      itemName: row.name,
      unitPriceMinor: row.price_minor,
      quantity: line.quantity,
      notes: line.notes ?? null,
      currency: row.currency,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertOrder = await client.query<OrderRowDb>(
      `INSERT INTO orders (
        cafe_id, user_id, customer_name, notes, total_minor, currency,
        order_type, source, status, payment_status
      ) VALUES ($1, NULL, $2, $3, $4, $5, $6, 'app', 'confirmed', 'unpaid')
      RETURNING
        id, cafe_id, user_id, pos_order_id, customer_name, notes, total_minor, currency,
        order_type, source, status, payment_status, quoted_pickup_time, pickup_time,
        completed_at, edit_token, parent_order_id, stripe_checkout_session_id,
        created_at, updated_at`,
      [cafeId, trimmedName, notes, totalMinor, currency!, orderType],
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
          JSON.stringify([]),
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

export async function findOrderByIdAndCafe(orderId: string, cafeId: string): Promise<NormalisedOrder | null> {
  if (!UUID_RE.test(orderId)) return null;
  return fetchOrderWithItems(pool, orderId, cafeId);
}

/**
 * Open orders for KDS display. Not exposed via HTTP until café-scoped KDS auth exists.
 */
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

/**
 * Mark order completed. Intended for future KDS routes behind KDS login.
 * Returns null if the order does not exist or is not in a completable status.
 */
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
