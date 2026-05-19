import type {
  CafeFeatures,
  LoyaltyReward,
  LoyaltySummaryResponse,
  LoyaltyTransactionsResponse,
  LoyaltyRewardsListResponse,
  RedeemRewardResponse,
  LoyaltyTransaction,
} from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { IRouter } from 'express';
import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCafeContext } from '../middleware/cafe-context.js';
import {
  countUnredeemedRewards,
  fetchLoyaltyTransactionsPage,
  insertRewardRedeemed,
  listUnredeemedRewards,
} from '../lib/loyalty/repository.js';

export const loyaltyRouter: IRouter = Router();

loyaltyRouter.use(requireCafeContext);

loyaltyRouter.get('/me', requireAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const userId = req.user!.userId;
  const features = req.cafe!.features as CafeFeatures;

  const membership = await pool.query<{
    loyalty_card_progress: number;
    loyalty_display_id: string;
  }>(
    `SELECT loyalty_card_progress, loyalty_display_id FROM cafe_users WHERE cafe_id = $1 AND user_id = $2`,
    [cafeId, userId],
  );

  if (membership.rows.length === 0) {
    return res.status(404).json({
      ok: false,
      error: 'No café membership for this user',
      code: ApiErrorCode.NOT_FOUND,
    });
  }

  const loyaltyCfg = features.loyalty;
  const rewardsAvailable = await countUnredeemedRewards({ pool, cafeId, userId });

  const data: LoyaltySummaryResponse = {
    stamps: membership.rows[0]!.loyalty_card_progress,
    stampsPerReward: loyaltyCfg?.enabled ? loyaltyCfg.stampsPerReward : 10,
    rewardsAvailable,
    rewardDescription: loyaltyCfg?.rewardDescription ?? 'Free drink',
    displayId: membership.rows[0]!.loyalty_display_id,
    loyaltyEnabled: loyaltyCfg?.enabled === true,
  };

  return res.json({ ok: true, data });
});

loyaltyRouter.get('/transactions', requireAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const userId = req.user!.userId;

  const limitRaw = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 20;
  const limit = Number.isFinite(limitRaw) ? limitRaw : 20;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const { transactions, nextCursor } = await fetchLoyaltyTransactionsPage({
    pool,
    cafeId,
    userId,
    limit,
    cursorCreatedAt: cursor,
  });

  const data: LoyaltyTransactionsResponse = { transactions, nextCursor };
  return res.json({ ok: true, data });
});

loyaltyRouter.get('/rewards', requireAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const userId = req.user!.userId;

  const rows = await listUnredeemedRewards({ pool, cafeId, userId });
  const rewards: LoyaltyReward[] = rows.map((r) => ({
    id: r.id,
    cafeId: r.cafe_id,
    userId: r.user_id,
    rewardType: r.reward_type,
    redeemedAt: r.redeemed_at ? r.redeemed_at.toISOString() : null,
    expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));

  const data: LoyaltyRewardsListResponse = { rewards };
  return res.json({ ok: true, data });
});

loyaltyRouter.post('/rewards/:rewardId/redeem', requireAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const userId = req.user!.userId;
  const rawId = req.params.rewardId;
  const rewardId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!rewardId?.trim()) {
    return res.status(400).json({
      ok: false,
      error: 'rewardId required',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upd = await client.query<{
      id: string;
      cafe_id: string;
      user_id: string;
      reward_type: string;
      redeemed_at: Date;
      expires_at: Date | null;
      metadata: unknown;
      created_at: Date;
    }>(
      `UPDATE loyalty_rewards
       SET redeemed_at = NOW()
       WHERE id = $1 AND cafe_id = $2 AND user_id = $3 AND redeemed_at IS NULL
       RETURNING id, cafe_id, user_id, reward_type, redeemed_at, expires_at, metadata, created_at`,
      [rewardId.trim(), cafeId, userId],
    );

    if (upd.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        ok: false,
        error: 'Reward not found or already redeemed',
        code: ApiErrorCode.NOT_FOUND,
      });
    }

    const tx = await insertRewardRedeemed({
      client,
      cafeId,
      userId,
      rewardId: rewardId.trim(),
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

    const data: RedeemRewardResponse = { reward, transaction };
    return res.json({ ok: true, data });
  } catch (e) {
    /* Rollback is best-effort — if the connection is already broken, throwing
     * here would hide the original error from the global handler. */
    try {
      await client.query('ROLLBACK');
    } catch {
      /* swallow secondary failure */
    }
    throw e;
  } finally {
    client.release();
  }
});
