import type { CafeFeatures, NormalisedOrder } from '@moonshot/types';
import { pool } from '../db.js';
import { emitCustomerServerToClient } from '../realtime/customer-events.js';

export function isCompletedWithinPickupGrace(params: {
  pickupTime: string | null;
  completedAt: string | null;
  nowMs?: number;
}): boolean {
  const pickupMs = params.pickupTime ? new Date(params.pickupTime).getTime() : null;
  if (pickupMs == null || !Number.isFinite(pickupMs)) return false;

  const completedMs = params.completedAt
    ? new Date(params.completedAt).getTime()
    : (params.nowMs ?? Date.now());

  return Number.isFinite(completedMs) && completedMs <= pickupMs + 2 * 60 * 1000;
}

/** After KDS marks an app order complete: loyalty counters + optional review prompt signal. */
export async function applyLoyaltyAfterKdsComplete(params: {
  cafeId: string;
  order: NormalisedOrder;
}): Promise<void> {
  const { cafeId, order } = params;
  const userId = order.customerId;
  if (!userId || order.source !== 'app') return;

  const cafeResult = await pool.query<{ features: unknown }>(
    `SELECT features FROM cafes WHERE id = $1`,
    [cafeId],
  );
  if (cafeResult.rows.length === 0) return;
  const features = cafeResult.rows[0]!.features as CafeFeatures;

  const onTime = isCompletedWithinPickupGrace({
    pickupTime: order.pickup.pickupTime,
    completedAt: order.pickup.completedAt,
  });

  const loyaltyEnabled = features.loyalty?.enabled === true;
  const reviewEnabled = features.review_nudge?.enabled === true;
  const googlePlaceId = features.review_nudge?.googlePlaceId ?? null;

  const upd = await pool.query<{ on_time_completed_orders: number; review_prompt_state: string }>(
    `UPDATE cafe_users SET
       total_orders = total_orders + 1,
       loyalty_stamps = loyalty_stamps + CASE WHEN $1 THEN 1 ELSE 0 END,
       on_time_completed_orders = on_time_completed_orders + CASE WHEN $2 THEN 1 ELSE 0 END
     WHERE cafe_id = $3 AND user_id = $4
     RETURNING on_time_completed_orders, review_prompt_state`,
    [loyaltyEnabled, onTime, cafeId, userId],
  );

  const row = upd.rows[0];
  if (!row) return;

  if (!reviewEnabled || !onTime) return;

  if (row.review_prompt_state === 'not_shown' && row.on_time_completed_orders === 3) {
    await pool.query(
      `UPDATE cafe_users SET review_prompt_state = 'shown_positive' WHERE cafe_id = $1 AND user_id = $2`,
      [cafeId, userId],
    );
    emitCustomerServerToClient(order.id, {
      type: 'customerReviewEligible',
      orderId: order.id,
      cafeId,
      googlePlaceId,
    });
  }
}
