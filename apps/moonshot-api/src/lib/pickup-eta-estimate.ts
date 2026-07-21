import type { KdsConfig } from '@moonshot/types';
import type { Pool } from 'pg';
import { KDS_OPEN_ORDER_STATUSES } from './orders/order-constants.js';
import { resolveEtaParams } from './pickup-eta-params.js';

/**
 * FIFO tail estimate: if a **new** order joined the back of the open queue now,
 * pickup ≈ now + base + perItem × (sum of item quantities across open orders).
 */
export async function estimateTailPickupForCafe(params: {
  db: Pool;
  cafeId: string;
  kdsConfig: KdsConfig;
}): Promise<{ pickupIso: string; minutesFromNow: number }> {
  const { db, cafeId, kdsConfig } = params;
  const { base, perItem } = resolveEtaParams(kdsConfig);

  const sumRes = await db.query<{ sum_qty: string }>(
    `SELECT COALESCE(SUM(oi.quantity), 0)::text AS sum_qty
     FROM orders o
     INNER JOIN order_items oi ON oi.order_id = o.id
     WHERE o.cafe_id = $1 AND o.status = ANY($2::text[])`,
    [cafeId, [...KDS_OPEN_ORDER_STATUSES]],
  );

  const qtyAhead = Number.parseInt(sumRes.rows[0]?.sum_qty ?? '0', 10) || 0;
  const minutes = base + perItem * qtyAhead;
  const now = Date.now();
  const pickupIso = new Date(now + minutes * 60_000).toISOString();
  const minutesFromNow = Math.max(1, Math.ceil(minutes));

  return { pickupIso, minutesFromNow };
}
