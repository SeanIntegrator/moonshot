import type { LoyaltyReward, LoyaltySummaryResponse, LoyaltyTransaction } from '@moonshot/types';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth.js';
import {
  fetchLoyaltySummary,
  fetchLoyaltyTransactions,
  fetchUnredeemedRewards,
} from '../api/loyalty-api.js';

/**
 * Rewards tab + Home headers: summary, ledger slice, and unredeemed rewards.
 * Refetch together so stamps/rewards stay consistent after redemption.
 */
export function useLoyalty(): {
  summary: LoyaltySummaryResponse | null;
  transactions: LoyaltyTransaction[];
  rewards: LoyaltyReward[];
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
} {
  const { isSignedIn, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<LoyaltySummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setSummary(null);
      setTransactions([]);
      setRewards([]);
      setNextCursor(null);
      return;
    }
    setLoading(true);
    try {
      const [me, tx, rw] = await Promise.all([
        fetchLoyaltySummary(),
        fetchLoyaltyTransactions(20),
        fetchUnredeemedRewards(),
      ]);
      setSummary(me);
      setTransactions(tx.transactions);
      setNextCursor(tx.nextCursor);
      setRewards(rw.rewards);
    } catch {
      setSummary(null);
      setTransactions([]);
      setRewards([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  const loadMore = useCallback(async () => {
    if (!isSignedIn || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const tx = await fetchLoyaltyTransactions(20, nextCursor);
      setTransactions((prev) => [...prev, ...tx.transactions]);
      setNextCursor(tx.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [isSignedIn, nextCursor, loadingMore]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  return {
    summary,
    transactions,
    rewards,
    nextCursor,
    loading,
    loadingMore,
    refresh,
    loadMore,
  };
}
