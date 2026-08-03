import type { LoyaltyRewardsListResponse, LoyaltySummaryResponse, LoyaltyTransactionsResponse } from '@moonshot/domain';
import { apiFetch } from '../lib/api.js';

export function fetchLoyaltySummary(): Promise<LoyaltySummaryResponse> {
  return apiFetch<LoyaltySummaryResponse>('/loyalty/me');
}

export function fetchLoyaltyTransactions(
  limit = 20,
  cursor?: string | null,
): Promise<LoyaltyTransactionsResponse> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (cursor?.trim()) q.set('cursor', cursor.trim());
  return apiFetch<LoyaltyTransactionsResponse>(`/loyalty/transactions?${q}`);
}

export function fetchUnredeemedRewards(): Promise<LoyaltyRewardsListResponse> {
  return apiFetch<LoyaltyRewardsListResponse>('/loyalty/rewards');
}
