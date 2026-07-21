import type { CreateOrderLineInput, NormalisedOrder, OrderType } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../../db.js';
import { ApiHttpError } from '../http-errors.js';
import type { OrderRowDb } from '../order-map.js';
import { consumeRewardForOrder } from '../loyalty/consume-reward-for-order.js';
import { applyRewardDiscountToTotal } from '../loyalty/apply-checkout-reward-pricing.js';
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
  redeemRewardId?: string | null;
  requestedPickupNotBefore?: Date | null;
}): Promise<{ order: NormalisedOrder; discountMinor: number; redeemedRewardId?: string }> {
  const {
    cafeId,
    userId,
    customerName,
    notes,
    orderType,
    lines,
    redeemRewardId,
    requestedPickupNotBefore = null,
  } = params;

  assertValidOrderType(orderType);
  const trimmedName = assertCustomerName(customerName);
  validateOrderLines(lines);

  if (redeemRewardId && !userId) {
    throw new ApiHttpError(
      401,
      ApiErrorCode.UNAUTHORIZED,
      'Sign in to redeem a loyalty reward on this order',
    );
  }

  const { lines: resolvedLines, currency, totalMinor: subtotalMinor } = await resolveOrderLinesWithModifiers({
    db: pool,
    cafeId,
    lines,
  });

  const { totalMinor, discountMinor } = applyRewardDiscountToTotal({
    subtotalMinor,
    lines: resolvedLines,
    redeemRewardId,
  });

  const order = await insertOrderWithResolvedLines({
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
    redeemRewardId: redeemRewardId ?? null,
    consumeReward: true,
    requestedPickupNotBefore,
  });

  return {
    order,
    discountMinor,
    redeemedRewardId: redeemRewardId && discountMinor > 0 ? redeemRewardId : undefined,
  };
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
  redeemRewardId?: string | null;
  consumeReward?: boolean;
  requestedPickupNotBefore?: Date | null;
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
    redeemRewardId = null,
    consumeReward = true,
    requestedPickupNotBefore = null,
  } = params;

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
    redeemRewardId,
    consumeReward,
    requestedPickupNotBefore,
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
  redeemRewardId: string | null;
  /** When false, reward is validated at checkout but consumed later (Stripe webhook). */
  consumeReward?: boolean;
  requestedPickupNotBefore?: Date | null;
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
    redeemRewardId,
    consumeReward = true,
    requestedPickupNotBefore = null,
  } = params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertOrder = await client.query<OrderRowDb>(
      `INSERT INTO orders (
        cafe_id, user_id, customer_name, notes, total_minor, currency,
        order_type, source, status, payment_status, requested_pickup_not_before
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'app', $8, $9, $10)
      RETURNING ${ORDER_SELECT_COLUMNS}`,
      [
        cafeId,
        userId,
        customerName,
        notes,
        totalMinor,
        currency,
        orderType,
        status,
        paymentStatus,
        requestedPickupNotBefore,
      ],
    );

    const orderRow = requireInsertedOrderRow(insertOrder.rows[0]);
    await insertOrderItems(client, orderRow.id, resolvedLines);

    if (redeemRewardId && userId && consumeReward) {
      await consumeRewardForOrder({
        client,
        cafeId,
        userId,
        rewardId: redeemRewardId,
        orderId: orderRow.id,
      });
    }

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
