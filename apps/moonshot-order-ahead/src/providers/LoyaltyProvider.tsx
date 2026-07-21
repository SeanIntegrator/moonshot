import type { LoyaltyReward, LoyaltySummaryResponse, LoyaltyTransaction } from '@moonshot/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchLoyaltySummary,
  fetchLoyaltyTransactions,
  fetchUnredeemedRewards,
} from '../api/loyalty-api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useCafeFeatures } from '../hooks/useCafeFeatures.js';

type LoyaltyContextValue = {
  summary: LoyaltySummaryResponse | null;
  transactions: LoyaltyTransaction[];
  rewards: LoyaltyReward[];
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  refresh: () => Promise<void>;
  /** First page of ledger — call from Rewards; no-op if already loaded this session. */
  ensureTransactions: () => Promise<void>;
  loadMore: () => Promise<void>;
};

const LoyaltyContext = createContext<LoyaltyContextValue | null>(null);

/**
 * Single loyalty fetch/cache for Home, Checkout, Rewards, and Order detail.
 * `refresh()` loads summary + rewards only; ledger is lazy via `ensureTransactions`.
 */
export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, loading: authLoading } = useAuth();
  const { loyaltyEnabled } = useCafeFeatures();
  const [summary, setSummary] = useState<LoyaltySummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const transactionsLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn || !loyaltyEnabled) {
      setSummary(null);
      setTransactions([]);
      setRewards([]);
      setNextCursor(null);
      transactionsLoadedRef.current = false;
      return;
    }
    setLoading(true);
    try {
      const [me, rw] = await Promise.all([fetchLoyaltySummary(), fetchUnredeemedRewards()]);
      setSummary(me);
      setRewards(rw.rewards);
    } catch {
      setSummary(null);
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, loyaltyEnabled]);

  const ensureTransactions = useCallback(async () => {
    if (!isSignedIn || !loyaltyEnabled || transactionsLoadedRef.current) return;
    setLoadingMore(true);
    try {
      const tx = await fetchLoyaltyTransactions(20);
      setTransactions(tx.transactions);
      setNextCursor(tx.nextCursor);
      transactionsLoadedRef.current = true;
    } catch {
      setTransactions([]);
      setNextCursor(null);
    } finally {
      setLoadingMore(false);
    }
  }, [isSignedIn, loyaltyEnabled]);

  const loadMore = useCallback(async () => {
    if (!isSignedIn || !loyaltyEnabled || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const tx = await fetchLoyaltyTransactions(20, nextCursor);
      setTransactions((prev) => [...prev, ...tx.transactions]);
      setNextCursor(tx.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [isSignedIn, loyaltyEnabled, nextCursor, loadingMore]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const value = useMemo(
    () => ({
      summary,
      transactions,
      rewards,
      nextCursor,
      loading,
      loadingMore,
      refresh,
      ensureTransactions,
      loadMore,
    }),
    [
      summary,
      transactions,
      rewards,
      nextCursor,
      loading,
      loadingMore,
      refresh,
      ensureTransactions,
      loadMore,
    ],
  );

  return <LoyaltyContext.Provider value={value}>{children}</LoyaltyContext.Provider>;
}

export function useLoyalty(): LoyaltyContextValue {
  const ctx = useContext(LoyaltyContext);
  if (!ctx) {
    throw new Error('useLoyalty requires LoyaltyProvider');
  }
  return ctx;
}
