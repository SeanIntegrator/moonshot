import type { NormalisedOrder } from '@moonshot/types';

/** Board snapshot for an optimistic recall — reopened as just-placed. */
export function toOptimisticRecalledOrder(order: NormalisedOrder): NormalisedOrder {
  return {
    ...order,
    status: 'confirmed',
    pickup: { ...order.pickup, completedAt: null },
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
