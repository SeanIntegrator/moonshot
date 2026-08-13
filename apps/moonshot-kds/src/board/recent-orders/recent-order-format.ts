import type { KdsConfig, NormalisedOrder } from '@moonshot/types';
import { deriveFlowLine } from '@moonshot/domain';

export function formatRelativeCompleted(iso: string | null | undefined): string {
  if (!iso) return 'Completed';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return 'Completed';
  const deltaSec = Math.round((Date.now() - ms) / 1000);
  if (deltaSec < 60) return 'Just now';
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86_400) return `${Math.floor(deltaSec / 3600)}h ago`;
  return `${Math.floor(deltaSec / 86_400)}d ago`;
}

export function itemSummary(order: NormalisedOrder, kdsConfig: KdsConfig): string {
  let drinks = 0;
  let foods = 0;
  for (const item of order.items) {
    const view = deriveFlowLine(item, kdsConfig);
    if (view.isFood) foods += item.quantity;
    else drinks += item.quantity;
  }
  const parts: string[] = [];
  if (drinks > 0) parts.push(`${drinks} drink${drinks === 1 ? '' : 's'}`);
  if (foods > 0) parts.push(`${foods} food`);
  return parts.length > 0 ? parts.join(' · ') : 'No items';
}

export function allLineIds(order: NormalisedOrder): Set<string> {
  return new Set(order.items.map((item) => item.id));
}

/**
 * On an explicit refresh, keep the barista's line ticks for orders still in
 * the list. New tickets start fully selected.
 */
export function mergeLineSelections(
  prev: Map<string, Set<string>>,
  orders: NormalisedOrder[],
  reset: boolean,
): Map<string, Set<string>> {
  const next = new Map<string, Set<string>>();
  for (const order of orders) {
    const all = allLineIds(order);
    if (reset) {
      next.set(order.id, all);
      continue;
    }
    const existing = prev.get(order.id);
    if (!existing) {
      next.set(order.id, all);
      continue;
    }
    next.set(order.id, new Set([...existing].filter((id) => all.has(id))));
  }
  return next;
}
