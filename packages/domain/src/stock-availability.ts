/**
 * Lazy stock mapping for modifier options.
 * Row absence / expired `out_until` → in stock. No cron.
 */

import type { StockAvailability } from '@moonshot/types';

export type { StockAvailability };

/**
 * `undefined` = no row (in stock).
 * `null` = out until manually restored.
 * `Date` in the future = out today; in the past = in stock.
 */
export function availabilityFromOutUntil(
  outUntil: Date | string | null | undefined,
  now: Date = new Date(),
): StockAvailability {
  if (outUntil === undefined) return 'in';
  if (outUntil === null) return 'out';
  const instant = typeof outUntil === 'string' ? new Date(outUntil) : outUntil;
  if (Number.isNaN(instant.getTime()) || instant.getTime() <= now.getTime()) return 'in';
  return 'out_today';
}

export function optionIsSellable(availability: StockAvailability): boolean {
  return availability === 'in';
}

export function outUntilForAvailability(
  availability: StockAvailability,
  nextOpen: Date | null,
): Date | null | undefined {
  if (availability === 'in') return undefined;
  if (availability === 'out') return null;
  return nextOpen;
}
