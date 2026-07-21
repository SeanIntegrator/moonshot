import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCafeFeatures } from '../hooks/useCafeFeatures.js';
import { useCafePath } from '../hooks/useCafePath.js';

type Feature = 'orderAhead' | 'loyalty';

/**
 * Redirects home when the café has disabled the given feature.
 * Prefer this over per-page useEffect guards so deep links stay consistent.
 */
export function RequireFeature({
  feature,
  children,
}: {
  feature: Feature;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { orderAheadEnabled, loyaltyEnabled } = useCafeFeatures();
  const enabled = feature === 'orderAhead' ? orderAheadEnabled : loyaltyEnabled;

  useEffect(() => {
    if (!enabled) {
      navigate(cafePath('/'), { replace: true });
    }
  }, [enabled, navigate, cafePath]);

  if (!enabled) return null;
  return children;
}
