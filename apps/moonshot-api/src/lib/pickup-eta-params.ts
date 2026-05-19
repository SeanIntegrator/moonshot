import type { KdsConfig } from '@moonshot/types';

/**
 * Default ETA constants used when {@link KdsConfig.eta} omits a value.
 * Shared between live FIFO recompute (`pickup-eta.ts`) and tail-estimate
 * (`pickup-eta-estimate.ts`) so the two stay in lockstep.
 */
export const DEFAULT_ETA_BASE_MINUTES = 8;
export const DEFAULT_ETA_PER_ITEM_MINUTES = 2;

export interface EtaParams {
  base: number;
  perItem: number;
}

/** Resolve base + per-item minutes from {@link KdsConfig.eta}, with safe defaults. */
export function resolveEtaParams(kds: KdsConfig): EtaParams {
  const e = kds.eta;
  const base = Number.isFinite(e.basePrepMinutes) ? e.basePrepMinutes : DEFAULT_ETA_BASE_MINUTES;
  const perItem = Number.isFinite(e.perItemMinutes)
    ? e.perItemMinutes
    : DEFAULT_ETA_PER_ITEM_MINUTES;
  return { base, perItem: Math.max(0, perItem) };
}
