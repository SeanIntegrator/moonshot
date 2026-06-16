import { ApiErrorCode } from '@moonshot/types';
import type { PoolClient } from 'pg';
import { ApiHttpError } from '../http-errors.js';
import { insertRewardRedeemed } from './repository.js';

/**
 * Atomically mark a loyalty reward redeemed and append ledger row for an order.
 * Caller must own the surrounding transaction.
 */
export async function consumeRewardForOrder(params: {
  client: PoolClient;
  cafeId: string;
  userId: string;
  rewardId: string;
  orderId: string;
}): Promise<void> {
  const { client, cafeId, userId, rewardId, orderId } = params;

  const upd = await client.query<{ id: string }>(
    `UPDATE loyalty_rewards
     SET redeemed_at = NOW()
     WHERE id = $1 AND cafe_id = $2 AND user_id = $3 AND redeemed_at IS NULL
     RETURNING id`,
    [rewardId, cafeId, userId],
  );

  if (upd.rows.length === 0) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Reward not found or already redeemed');
  }

  await insertRewardRedeemed({
    client,
    cafeId,
    userId,
    rewardId,
    orderId,
  });
}
