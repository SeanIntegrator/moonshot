/**
 * Loyalty stamps and rewards — ledger-first model aligned with schema-draft.
 */

import {
  isDrinkMenuCategory,
  isFoodMenuCategory,
  type IsoDateTime,
} from '@moonshot/types';

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

/** Known checkout-redeemable reward kinds (issuance may still only create free_coffee). */
export type KnownLoyaltyRewardType = 'free_coffee' | 'free_pastry';

export type RewardType = KnownLoyaltyRewardType | string;

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

/** Minimal line shape for applicability / discount (client cart or resolved order lines). */
export type LoyaltyDiscountLine = {
  category: string;
  unitPriceMinor: number;
};

export function isKnownLoyaltyRewardType(value: string): value is KnownLoyaltyRewardType {
  return value === 'free_coffee' || value === 'free_pastry';
}

function lineMatchesRewardType(
  rewardType: string,
  category: string,
  foodSectionKeys?: readonly string[] | null,
): boolean {
  if (rewardType === 'free_coffee') return isDrinkMenuCategory(category, foodSectionKeys);
  if (rewardType === 'free_pastry') return isFoodMenuCategory(category, foodSectionKeys);
  return false;
}

/** Whether the basket has at least one line the reward can apply to. */
export function isLoyaltyRewardApplicable(
  rewardType: string,
  lines: ReadonlyArray<Pick<LoyaltyDiscountLine, 'category'>>,
  foodSectionKeys?: readonly string[] | null,
): boolean {
  return lines.some((line) => lineMatchesRewardType(rewardType, line.category, foodSectionKeys));
}

/**
 * Free-item discount: cheapest unit price among matching lines (0 if none).
 * Custom drink sections count for free_coffee; foodSectionKeys / *food* for free_pastry.
 */
export function computeLoyaltyRewardDiscountMinor(
  rewardType: string,
  lines: ReadonlyArray<LoyaltyDiscountLine>,
  foodSectionKeys?: readonly string[] | null,
): number {
  let min: number | null = null;
  for (const line of lines) {
    if (!lineMatchesRewardType(rewardType, line.category, foodSectionKeys)) continue;
    if (min == null || line.unitPriceMinor < min) min = line.unitPriceMinor;
  }
  return min ?? 0;
}

/** Customer-facing reward title on checkout / rewards list. */
export function loyaltyRewardLabel(
  rewardType: string,
  cafeRewardDescription?: string | null,
): string {
  if (rewardType === 'free_pastry') return 'Free pastry';
  if (rewardType === 'free_coffee') {
    const custom = cafeRewardDescription?.trim();
    return custom || 'Free drink';
  }
  return cafeRewardDescription?.trim() || 'Reward';
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
