import { cafeOpenStatus, type CafeOpenStatus } from '@moonshot/types';
import { useMemo } from 'react';
import { useCafe } from './useCafe.js';
import { useCafeFeatures } from './useCafeFeatures.js';

export type CafeOpenStatusView = CafeOpenStatus & {
  /** Feature flag on and café currently open — safe to take orders. */
  orderingAvailable: boolean;
  /** Bottom-bar copy when closed, e.g. `Cafe is closed · reopens 8:00 am`. */
  closedBarMessage: string;
};

function closedBarMessageFrom(status: CafeOpenStatus): string {
  const match = /^Closed · opens (.+)$/.exec(status.caption);
  if (match?.[1]) return `Cafe is closed · reopens ${match[1]}`;
  return 'Cafe is currently closed';
}

/** Open/closed + order-ahead availability for gating Order tab, cart bar, and Add. */
export function useCafeOpenStatus(): CafeOpenStatusView {
  const { cafe } = useCafe();
  const { orderAheadEnabled } = useCafeFeatures();

  return useMemo(() => {
    const status = cafeOpenStatus(cafe?.hours, cafe?.timezone ?? 'UTC');
    return {
      ...status,
      orderingAvailable: orderAheadEnabled && status.isOpen,
      closedBarMessage: closedBarMessageFrom(status),
    };
  }, [cafe?.hours, cafe?.timezone, orderAheadEnabled]);
}
