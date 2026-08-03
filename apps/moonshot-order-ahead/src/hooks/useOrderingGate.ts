import type { NormalisedOrder } from '@moonshot/types';
import { useMemo } from 'react';
import { useActiveOrders } from '../providers/ActiveOrdersProvider.js';
import { useCafeOpenStatus } from './useCafeOpenStatus.js';

type OrderingGate = {
  activeOrder: NormalisedOrder | null;
  hasActiveOrder: boolean;
  orderingAvailable: boolean;
  /** Café open + order-ahead on + no in-progress order. */
  canStartNewOrder: boolean;
  initialised: boolean;
};

/** Single source of truth for whether the customer may start a new order. */
export function useOrderingGate(): OrderingGate {
  const { orderingAvailable } = useCafeOpenStatus();
  const { active, initialised } = useActiveOrders();

  return useMemo(() => {
    const activeOrder = active[0] ?? null;
    return {
      activeOrder,
      hasActiveOrder: activeOrder != null,
      orderingAvailable,
      canStartNewOrder: orderingAvailable && activeOrder == null,
      initialised,
    };
  }, [active, initialised, orderingAvailable]);
}
