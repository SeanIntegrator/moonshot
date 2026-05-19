import type { NormalisedOrder } from '@moonshot/types';
import { pool } from '../db.js';
import { emitCustomerServerToClient } from '../realtime/customer-events.js';
import { findCafeById } from './cafes-repository.js';
import { applyLedgerStampAndRewards } from './loyalty/apply-ledger-on-complete.js';
import { onTimeForReviewPrompt, stampsEarnedForCompletedOrder } from './loyalty/loyalty-rules.js';

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

/** After KDS marks an app order complete: ledger stamps/rewards + counters + optional review prompt signal. */
export async function applyLoyaltyAfterKdsComplete(params: {
  cafeId: string;
  order: NormalisedOrder;
}): Promise<void> {
  const { cafeId, order } = params;
  const userId = order.customerId;
  if (!userId || order.source !== 'app') return;

  const cafe = await findCafeById(cafeId);
  if (!cafe) return;
  const { features } = cafe;
  const timezone = cafe.timezone?.trim() || 'Europe/London';

  const loyaltyEnabled = features.loyalty?.enabled === true;
  const reviewEnabled = features.review_nudge?.enabled === true;
  const googlePlaceId = features.review_nudge?.googlePlaceId ?? null;

  const completedAtIso = order.pickup.completedAt;
  const completedDate = completedAtIso ? new Date(completedAtIso) : new Date();

  const onTime = onTimeForReviewPrompt({
    pickupTimeIso: order.pickup.pickupTime,
    completedAtIso: completedAtIso,
  });

  const stampsDelta =
    loyaltyEnabled && features.loyalty
      ? stampsEarnedForCompletedOrder({
          loyalty: features.loyalty,
          cafeTimezone: timezone,
          completedAt: completedDate,
        })
      : 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /**
     * The stamp ledger has a unique index that makes `stamp_earned` idempotent
     * per `(cafe_id, user_id, order_id)`. Mirror that idempotency here for the
     * `cafe_users` lifetime counters so a re-run (replay, retry, future webhook
     * driven completion) does not drift `total_orders` or
     * `on_time_completed_orders`.
     */
    let ledgerInserted = true;
    if (loyaltyEnabled && stampsDelta > 0 && features.loyalty) {
      const result = await applyLedgerStampAndRewards({
        client,
        cafeId,
        userId,
        order,
        features,
        cafeTimezone: timezone,
        stampsDelta,
      });
      ledgerInserted = result.inserted;
    }

    if (!ledgerInserted) {
      await client.query('COMMIT');
      return;
    }

    const upd = await client.query<{ on_time_completed_orders: number; review_prompt_state: string }>(
      `UPDATE cafe_users SET
         total_orders = total_orders + 1,
         on_time_completed_orders = on_time_completed_orders + CASE WHEN $1 THEN 1 ELSE 0 END
       WHERE cafe_id = $2 AND user_id = $3
       RETURNING on_time_completed_orders, review_prompt_state`,
      [onTime, cafeId, userId],
    );

    const row = upd.rows[0];
    if (!row) {
      await client.query('COMMIT');
      return;
    }

    let shouldEmitReview = false;
    if (
      reviewEnabled &&
      onTime &&
      row.review_prompt_state === 'not_shown' &&
      row.on_time_completed_orders === 3
    ) {
      await client.query(
        `UPDATE cafe_users SET review_prompt_state = 'shown_positive' WHERE cafe_id = $1 AND user_id = $2`,
        [cafeId, userId],
      );
      shouldEmitReview = true;
    }

    await client.query('COMMIT');

    if (shouldEmitReview) {
      emitCustomerServerToClient(order.id, {
        type: 'customerReviewEligible',
        orderId: order.id,
        cafeId,
        googlePlaceId,
      });
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
