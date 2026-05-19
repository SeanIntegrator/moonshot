/**
 * Loyalty stamps and rewards — ledger-first model aligned with schema-draft.
 */

import type { IsoDateTime } from './order.js';

export type LoyaltyTransactionType =
  | 'stamp_earned'
  | 'reward_earned'
  | 'reward_redeemed'
  | 'adjustment';

export interface LoyaltyTransaction {
  id: string;
  cafeId: string;
  userId: string;
  orderId: string | null;
  transactionType: LoyaltyTransactionType;
  stampsDelta: number;
  metadata: Record<string, unknown>;
  createdAt: IsoDateTime;
}

/** Denormalised / cache row — optional; ledger remains authoritative */
export interface LoyaltyCard {
  cafeId: string;
  userId: string;
  stampsCount: number;
  rewardsAvailable: number;
  updatedAt: IsoDateTime;
}

export type RewardType = 'free_coffee' | string;

export interface LoyaltyReward {
  id: string;
  cafeId: string;
  userId: string;
  rewardType: RewardType;
  redeemedAt: IsoDateTime | null;
  expiresAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  /** Issuance metadata / POS correlation — optional */
  metadata?: Record<string, unknown>;
}

export interface RewardRedemptionRequest {
  cafeId: string;
  userId: string;
  rewardId: string;
  orderId?: string | null;
}

/** GET /loyalty/me — café loyalty settings + cache snapshot */
export interface LoyaltySummaryResponse {
  stamps: number;
  stampsPerReward: number;
  rewardsAvailable: number;
  rewardDescription: string;
  /** Stable short id for QR / till (scoped per café membership) */
  displayId: string;
  loyaltyEnabled: boolean;
}

export interface LoyaltyTransactionsResponse {
  transactions: LoyaltyTransaction[];
  /** ISO timestamp cursor for next page (exclusive) */
  nextCursor: IsoDateTime | null;
}

export interface LoyaltyRewardsListResponse {
  rewards: LoyaltyReward[];
}

export interface RedeemRewardResponse {
  reward: LoyaltyReward;
  transaction: LoyaltyTransaction;
}
