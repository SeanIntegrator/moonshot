import type { KdsConfig } from '@moonshot/types';
import type { Pool, PoolClient } from 'pg';
import { KDS_OPEN_ORDER_STATUSES } from './orders-repository.js';
import { resolveEtaParams } from './pickup-eta-params.js';
import { emitKdsServerToClient } from '../realtime/kds-events.js';
import { emitCustomerServerToClient } from '../realtime/customer-events.js';

type OpenOrderQtyRow = { id: string; items_qty: string };

/**
 * FIFO queue: open KDS orders by created_at ASC. For each order j, ETA = now + base + perItem * (sum of quantities in orders 0..j-1).
 * Sets `quoted_pickup_time` only on first assignment; `pickup_time` always reflects the live FIFO estimate.
 */
export async function recomputePickupEtasForCafe(params: {
  db: Pool | PoolClient;
  cafeId: string;
  kdsConfig: KdsConfig;
}): Promise<void> {
  const { db, cafeId, kdsConfig } = params;
  const { base, perItem } = resolveEtaParams(kdsConfig);

  const ordersRes = await db.query<OpenOrderQtyRow>(
    `SELECT o.id,
            COALESCE(SUM(oi.quantity), 0)::text AS items_qty
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.cafe_id = $1 AND o.status = ANY($2::text[])
     GROUP BY o.id, o.created_at
     ORDER BY o.created_at ASC`,
    [cafeId, [...KDS_OPEN_ORDER_STATUSES]],
  );

  const now = Date.now();
  let cumulativeQty = 0;
  const updates: Array<{ orderId: string; pickupIso: string }> = [];

  for (const row of ordersRes.rows) {
    const qtyAhead = cumulativeQty;
    const minutes = base + perItem * qtyAhead;
    const pickupMs = now + minutes * 60_000;
    const pickupIso = new Date(pickupMs).toISOString();
    updates.push({ orderId: row.id, pickupIso });
    cumulativeQty += Number.parseInt(row.items_qty || '0', 10) || 0;
  }

  if (updates.length === 0) return;

  for (const u of updates) {
    await db.query(
      `UPDATE orders
       SET pickup_time = $1::timestamptz,
           quoted_pickup_time = COALESCE(quoted_pickup_time, $1::timestamptz),
           updated_at = NOW()
       WHERE id = $2 AND cafe_id = $3`,
      [u.pickupIso, u.orderId, cafeId],
    );
  }

  emitKdsServerToClient(cafeId, {
    type: 'kds:eta:updated',
    updates: updates.map((u) => ({ orderId: u.orderId, pickupTime: u.pickupIso })),
  });

  for (const u of updates) {
    emitCustomerServerToClient(u.orderId, {
      type: 'customerEtaUpdated',
      updates: [{ orderId: u.orderId, pickupTime: u.pickupIso }],
    });
  }
}
