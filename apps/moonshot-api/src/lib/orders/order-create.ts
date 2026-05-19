import type { CreateOrderLineInput, NormalisedOrder, OrderType } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../../db.js';
import { ApiHttpError } from '../http-errors.js';
import type { OrderRowDb } from '../order-map.js';
import { resolveOrderLinesWithModifiers, type ResolvedOrderLine } from '../order-modifiers.js';
import {
  assertCustomerName,
  assertValidOrderType,
  ORDER_SELECT_COLUMNS,
  validateOrderLines,
} from './order-constants.js';
import { fetchOrderWithItems } from './order-read.js';
import { insertOrderItems, requireInsertedOrderRow } from './order-write-helpers.js';

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

  assertValidOrderType(orderType);
  const trimmedName = assertCustomerName(customerName);
  validateOrderLines(lines);

  const { lines: resolvedLines, currency, totalMinor } = await resolveOrderLinesWithModifiers({
    db: pool,
    cafeId,
    lines,
  });

  return insertOrderWithResolvedLines({
    cafeId,
    userId,
    customerName: trimmedName,
    notes,
    orderType,
    resolvedLines,
    currency,
    totalMinor,
    status: 'confirmed',
    paymentStatus: 'unpaid',
  });
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

  assertValidOrderType(orderType);
  const trimmedName = assertCustomerName(customerName);

  return insertOrderWithResolvedLines({
    cafeId,
    userId,
    customerName: trimmedName,
    notes,
    orderType,
    resolvedLines,
    currency,
    totalMinor,
    status: 'pending',
    paymentStatus: 'unpaid',
  });
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

  assertValidOrderType(orderType);
  const trimmedName = assertCustomerName(customerName);
  validateOrderLines(lines);

  const { lines: resolvedLines, currency, totalMinor } = await resolveOrderLinesWithModifiers({
    db: pool,
    cafeId,
    lines,
  });

  return insertPendingOrderWithResolvedLines({
    cafeId,
    userId,
    customerName: trimmedName,
    notes,
    orderType,
    resolvedLines,
    currency,
    totalMinor,
  });
}

async function insertOrderWithResolvedLines(params: {
  cafeId: string;
  userId: string | null;
  customerName: string;
  notes: string | null;
  orderType: OrderType;
  resolvedLines: ResolvedOrderLine[];
  currency: string;
  totalMinor: number;
  status: 'pending' | 'confirmed';
  paymentStatus: 'unpaid';
}): Promise<NormalisedOrder> {
  const {
    cafeId,
    userId,
    customerName,
    notes,
    orderType,
    resolvedLines,
    currency,
    totalMinor,
    status,
    paymentStatus,
  } = params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertOrder = await client.query<OrderRowDb>(
      `INSERT INTO orders (
        cafe_id, user_id, customer_name, notes, total_minor, currency,
        order_type, source, status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'app', $8, $9)
      RETURNING ${ORDER_SELECT_COLUMNS}`,
      [cafeId, userId, customerName, notes, totalMinor, currency, orderType, status, paymentStatus],
    );

    const orderRow = requireInsertedOrderRow(insertOrder.rows[0]);
    await insertOrderItems(client, orderRow.id, resolvedLines);

    await client.query('COMMIT');

    const full = await fetchOrderWithItems(pool, orderRow.id, cafeId);
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
