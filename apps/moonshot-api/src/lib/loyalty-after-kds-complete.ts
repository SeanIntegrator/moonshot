import type { NormalisedOrder } from '@moonshot/types';
import { pool } from '../db.js';
import { emitCustomerServerToClient } from '../realtime/customer-events.js';
import { ensureCafeMembership } from './cafe/cafe-membership.js';
import { findCafeById } from './cafes-repository.js';
import { fetchOrderWithItems } from './orders/order-read.js';
import { applyLedgerStampAndRewards } from './loyalty/apply-ledger-on-complete.js';
import { onTimeForReviewPrompt, stampsEarnedForCompletedOrder } from './loyalty/loyalty-rules.js';

/** Result of post-complete loyalty apply — carried on `customerOrderCompleted` when applied. */
export type LoyaltyApplyResult =
  | { applied: false }
  | {
      applied: true;
      stamps: number;
      stampsPerReward: number;
      rewardsAvailable: number;
    };

/** After KDS marks an app order complete: ledger stamps/rewards + counters + optional review prompt signal. */
export async function applyLoyaltyAfterKdsComplete(params: {
  cafeId: string;
  order: NormalisedOrder;
}): Promise<LoyaltyApplyResult> {
  const { cafeId, order } = params;
  const userId = order.customerId;
  if (!userId || order.source !== 'app') return { applied: false };

  const cafe = await findCafeById(cafeId);
  if (!cafe) return { applied: false };
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

    await ensureCafeMembership({ db: client, cafeId, userId });

    /**
     * The stamp ledger has a unique index that makes `stamp_earned` idempotent
     * per `(cafe_id, user_id, order_id)`. Mirror that idempotency here for the
     * `cafe_users` lifetime counters so a re-run (replay, retry, future webhook
     * driven completion) does not drift `total_orders` or
     * `on_time_completed_orders`.
     */
    let ledgerInserted = true;
    let loyaltyPayload: LoyaltyApplyResult = { applied: false };
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
      if (result.inserted) {
        const thresholdRaw = features.loyalty.stampsPerReward ?? 10;
        const stampsPerReward =
          Number.isFinite(thresholdRaw) && thresholdRaw >= 1 ? Math.floor(thresholdRaw) : 10;
        loyaltyPayload = {
          applied: true,
          stamps: result.cardProgress,
          stampsPerReward,
          rewardsAvailable: result.rewardsAvailable,
        };
      }
    }

    if (!ledgerInserted) {
      await client.query('COMMIT');
      return { applied: false };
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
      console.error('[loyalty.kdsComplete] cafe_users row missing after ensure', {
        cafeId,
        orderId: order.id,
        userId,
      });
      await client.query('COMMIT');
      return { applied: false };
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

    return loyaltyPayload;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Idempotent replay for ops/backfill when KDS loyalty side-effects were swallowed. */
export async function replayLoyaltyForCompletedOrder(params: {
  cafeId: string;
  orderId: string;
}): Promise<boolean> {
  const order = await fetchOrderWithItems(pool, params.orderId, params.cafeId);
  if (!order || order.status !== 'completed') return false;
  await applyLoyaltyAfterKdsComplete({ cafeId: params.cafeId, order });
  return true;
}
