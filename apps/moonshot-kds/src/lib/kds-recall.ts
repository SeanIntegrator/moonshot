import { walkUpSlaDeadlineIso } from '@moonshot/domain';
import type { NormalisedOrder } from '@moonshot/types';

/** Board snapshot for an optimistic recall — reopened on a fresh walk-up SLA. */
export function toOptimisticRecalledOrder(
  order: NormalisedOrder,
  nowMs: number = Date.now(),
): NormalisedOrder {
  return {
    ...order,
    status: 'confirmed',
    pickup: {
      ...order.pickup,
      completedAt: null,
      pickupTime: walkUpSlaDeadlineIso(nowMs),
      etaMode: 'manual_override',
    },
  };
}

/** Line ids the barista left unticked — those come back pre-crossed. */
export function unselectedLineIds(
  order: NormalisedOrder,
  lineIds: readonly string[],
): Set<string> {
  const selected = new Set(lineIds);
  return new Set(order.items.map((item) => item.id).filter((id) => !selected.has(id)));
}
