import type { CafeOpenStatus } from '@moonshot/types';
import { cafeOpenStatusForCafe } from '@moonshot/domain';
import { useMemo } from 'react';
import { useCafe } from './useCafe.js';
import { useCafeFeatures } from './useCafeFeatures.js';

export type CafeOpenStatusView = CafeOpenStatus & {
  /** Feature flag on and café currently accepting orders. */
  orderingAvailable: boolean;
  /** Bottom-bar copy when closed, e.g. `Cafe is closed · reopens 8:00 am`. */
  closedBarMessage: string;
};

function closedBarMessageFrom(status: CafeOpenStatus): string {
  if (status.reason === 'paused') {
    const match = /back at (.+)$/.exec(status.caption);
    if (match?.[1]) return `Back shortly · back at ${match[1]}`;
    return 'Back shortly';
  }
  const match = /^Closed · opens (.+)$/.exec(status.caption);
  if (match?.[1]) return `Cafe is closed · reopens ${match[1]}`;
  return 'Cafe is currently closed';
}

/** Open/closed + order-ahead availability for gating Order tab, cart bar, and Add. */
export function useCafeOpenStatus(): CafeOpenStatusView {
  const { cafe } = useCafe();
  const { orderAheadEnabled } = useCafeFeatures();

  return useMemo(() => {
    const status = cafe
      ? cafeOpenStatusForCafe(cafe)
      : { isOpen: false, caption: 'Closed', reason: 'closed' as const };
    return {
      ...status,
      orderingAvailable: orderAheadEnabled && status.isOpen,
      closedBarMessage: closedBarMessageFrom(status),
    };
  }, [cafe, orderAheadEnabled]);
}
