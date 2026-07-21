import type { PickupEstimateResponse } from '@moonshot/types';
import { useEffect, useState } from 'react';
import { fetchPickupEstimate } from '../api/orders-api.js';

/**
 * Shared pickup ETA for Menu chip + Checkout. One fetch per mount tree
 * that uses the hook (callers that both need it should lift or accept
 * duplicate fetches only if mounted on separate routes — which they are).
 */
export function usePickupEstimate(): {
  estimate: PickupEstimateResponse | null;
  loading: boolean;
} {
  const [estimate, setEstimate] = useState<PickupEstimateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const est = await fetchPickupEstimate();
        if (!cancelled) setEstimate(est);
      } catch {
        if (!cancelled) setEstimate(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { estimate, loading };
}
