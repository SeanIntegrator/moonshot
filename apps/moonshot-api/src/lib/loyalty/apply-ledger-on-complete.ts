import type { CafeFeatures, NormalisedOrder } from '@moonshot/types';
import type { PoolClient } from 'pg';
import {
  insertLoyaltyRewardRow,
  insertRewardEarned,
  insertStampEarnIfAbsent,
  lockMembershipRow,
} from './repository.js';

/**
 * Stamp ledger + punch-card rollover inside an open transaction.
 * Caller owns `BEGIN`/`COMMIT` and updates `total_orders` / `on_time_completed_orders`.
 */
export async function applyLedgerStampAndRewards(params: {
  client: PoolClient;
  cafeId: string;
  userId: string;
  order: NormalisedOrder;
  features: CafeFeatures;
  cafeTimezone: string;
  stampsDelta: number;
}): Promise<{ finalLoyaltyStamps: number }> {
  const { client, cafeId, userId, order, features, stampsDelta } = params;

  const thresholdRaw = features.loyalty?.stampsPerReward ?? 10;
  const stampsPerReward =
    Number.isFinite(thresholdRaw) && thresholdRaw >= 1 ? Math.floor(thresholdRaw) : 10;

  const lock = await lockMembershipRow({ client, cafeId, userId });
  if (!lock) {
    throw new Error('cafe_users row missing during loyalty apply');
  }

  const { inserted } = await insertStampEarnIfAbsent({
    client,
    cafeId,
    userId,
    orderId: order.id,
    stampsDelta,
    metadata: { orderId: order.id, source: order.source },
  });

  if (!inserted) {
    return { finalLoyaltyStamps: lock.loyaltyStamps };
  }

  let stamps = lock.loyaltyStamps + stampsDelta;

  while (stamps >= stampsPerReward) {
    const rewardId = await insertLoyaltyRewardRow({
      client,
      cafeId,
      userId,
      rewardType: 'free_coffee',
      metadata: { issuedFromOrderId: order.id },
    });

    await insertRewardEarned({
      client,
      cafeId,
      userId,
      orderId: order.id,
      rewardId,
    });

    stamps -= stampsPerReward;
  }

  await client.query(
    `UPDATE cafe_users SET loyalty_stamps = $3 WHERE cafe_id = $1 AND user_id = $2`,
    [cafeId, userId, stamps],
  );

  return { finalLoyaltyStamps: stamps };
}
