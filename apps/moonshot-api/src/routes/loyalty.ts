import type { CafeFeatures } from '@moonshot/types';
import type {
  LoyaltyReward,
  LoyaltySummaryResponse,
  LoyaltyTransactionsResponse,
  LoyaltyRewardsListResponse,
} from '@moonshot/domain';
import { ApiErrorCode } from '@moonshot/types';
import type { IRouter } from 'express';
import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCafeContext } from '../middleware/cafe-context.js';
import {
  countUnredeemedRewards,
  fetchLoyaltyTransactionsPage,
  listUnredeemedRewards,
} from '../lib/loyalty/repository.js';
import { redeemLoyaltyReward } from '../lib/loyalty/redeem-reward.js';
import { ApiHttpError } from '../lib/http-errors.js';

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
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'No café membership for this user');
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

  const data = await redeemLoyaltyReward({ pool, cafeId, userId, rewardId: rewardId ?? '' });
  return res.json({ ok: true, data });
});
