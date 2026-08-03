import type { LoyaltyReward, LoyaltyTransaction, RedeemRewardResponse } from '@moonshot/domain';
import { ApiErrorCode } from '@moonshot/types';
import type { Pool } from 'pg';
import { ApiHttpError } from '../http-errors.js';
import { insertRewardRedeemed } from './repository.js';

type RedeemedRewardRow = {
  id: string;
  cafe_id: string;
  user_id: string;
  reward_type: string;
  redeemed_at: Date;
  expires_at: Date | null;
  metadata: unknown;
  created_at: Date;
};

/**
 * Marks a reward redeemed and writes the loyalty ledger row in one transaction.
 */
export async function redeemLoyaltyReward(params: {
  pool: Pool;
  cafeId: string;
  userId: string;
  rewardId: string;
}): Promise<RedeemRewardResponse> {
  const { pool, cafeId, userId } = params;
  const rewardId = params.rewardId.trim();
  if (!rewardId) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'rewardId required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upd = await client.query<RedeemedRewardRow>(
      `UPDATE loyalty_rewards
       SET redeemed_at = NOW()
       WHERE id = $1 AND cafe_id = $2 AND user_id = $3 AND redeemed_at IS NULL
       RETURNING id, cafe_id, user_id, reward_type, redeemed_at, expires_at, metadata, created_at`,
      [rewardId, cafeId, userId],
    );

    if (upd.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Reward not found or already redeemed');
    }

    const tx = await insertRewardRedeemed({
      client,
      cafeId,
      userId,
      rewardId,
    });

    await client.query('COMMIT');

    const r = upd.rows[0]!;
    const reward: LoyaltyReward = {
      id: r.id,
      cafeId: r.cafe_id,
      userId: r.user_id,
      rewardType: r.reward_type,
      redeemedAt: r.redeemed_at.toISOString(),
      expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
      createdAt: r.created_at.toISOString(),
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    };

    const transaction: LoyaltyTransaction = {
      id: tx.id,
      cafeId,
      userId,
      orderId: null,
      transactionType: 'reward_redeemed',
      stampsDelta: 0,
      metadata: { rewardId: reward.id },
      createdAt: tx.createdAt,
    };

    return { reward, transaction };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* swallow secondary failure */
    }
    throw e;
  } finally {
    client.release();
  }
}
