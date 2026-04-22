/**
 * KDS-specific view models — extends normalised orders with prep/display hints.
 */

import type { NormalisedOrder } from './order.js';

export type KdsChipShape = 'square' | 'round';

export interface KdsChip {
  label: string;
  shape: KdsChipShape;
}

/**
 * Flow-style prep hints (milk colour, bean badge, modifier chips).
 * Populated server-side from `KdsConfig` + line item modifiers.
 */
export interface KdsPrep {
  milkKey?: string | null;
  beanBadgeKey?: string | null;
  chips?: KdsChip[];
}

/**
 * Single card on the board — same payload as `kds:order:*` socket events.
 */
export interface KdsOrderCard extends NormalisedOrder {
  /** FIFO hint from server queue computation */
  queuePosition?: number;
  /** Server-derived prep hints keyed by `NormalisedOrderItem.id` */
  linePrepByItemId?: Record<string, KdsPrep>;
}
