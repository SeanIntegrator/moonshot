import type { KdsConfig } from '@moonshot/types';
import type { Pool, PoolClient } from 'pg';
import { KDS_OPEN_ORDER_STATUSES } from './orders/order-constants.js';
import { resolveEtaParams } from './pickup-eta-params.js';
import { applyPickupNotBeforeFloor } from './requested-pickup.js';
import { emitKdsServerToClient } from '../realtime/kds-events.js';
import { emitCustomerServerToClient } from '../realtime/customer-events.js';

type OpenOrderQtyRow = {
  id: string;
  items_qty: string;
  requested_pickup_not_before: Date | string | null;
  eta_mode: string;
};

/**
 * Recompute live pickup ETAs for all open KDS orders in a café.
 *
 * FIFO queue: open orders ordered by board_opened_at ASC so queue depth
 * matches KDS board position. Recall resets board_opened_at, which puts
 * remakes at the back instead of inflating ETAs via the original created_at.
 * For each order j, base FIFO minutes = basePrep + perItem × (sum of
 * quantities in orders ahead).
 * Live ETA = max(FIFO ms, requested_pickup_not_before) so a customer delay
 * ("not before 30 min") is never overwritten by a shorter queue estimate.
 * Orders with `eta_mode = manual_override` keep their barista-stretched
 * pickup_time and are skipped for writes (still count toward queue depth).
 * `quoted_pickup_time` is set only on first assignment; `pickup_time` always
 * reflects the live estimate and is broadcast to KDS + customer sockets.
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
            o.requested_pickup_not_before,
            o.eta_mode,
            COALESCE(SUM(oi.quantity), 0)::text AS items_qty
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.cafe_id = $1 AND o.status = ANY($2::text[])
     GROUP BY o.id, o.board_opened_at, o.requested_pickup_not_before, o.eta_mode
     ORDER BY o.board_opened_at ASC`,
    [cafeId, [...KDS_OPEN_ORDER_STATUSES]],
  );

  const now = Date.now();
  let cumulativeQty = 0;
  const updates: Array<{ orderId: string; pickupIso: string }> = [];

  for (const row of ordersRes.rows) {
    const qtyAhead = cumulativeQty;
    cumulativeQty += Number.parseInt(row.items_qty || '0', 10) || 0;

    // Barista stretch wins until complete — still occupies queue depth above.
    if (row.eta_mode === 'manual_override') continue;

    const minutes = base + perItem * qtyAhead;
    const fifoMs = now + minutes * 60_000;
    const notBeforeRaw = row.requested_pickup_not_before;
    const notBeforeMs =
      notBeforeRaw == null
        ? null
        : typeof notBeforeRaw === 'string'
          ? new Date(notBeforeRaw).getTime()
          : notBeforeRaw.getTime();
    const pickupMs = applyPickupNotBeforeFloor(
      fifoMs,
      notBeforeMs != null && Number.isFinite(notBeforeMs) ? notBeforeMs : null,
    );
    const pickupIso = new Date(pickupMs).toISOString();
    updates.push({ orderId: row.id, pickupIso });
  }

  if (updates.length === 0) return;

  for (const u of updates) {
    await db.query(
      `UPDATE orders
       SET pickup_time = $1::timestamptz,
           quoted_pickup_time = COALESCE(quoted_pickup_time, $1::timestamptz),
           updated_at = NOW()
       WHERE id = $2 AND cafe_id = $3 AND eta_mode = 'auto'`,
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
