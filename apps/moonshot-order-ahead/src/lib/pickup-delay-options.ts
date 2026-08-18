/** Candidate delays in minutes; filtered by café maxPickupMinutes. */
export const DEFAULT_PICKUP_DELAY_STEPS = [0, 10, 20, 30, 40, 50, 60] as const;

export type PickupDelayMinutes = number;

export function pickupDelayOptions(
  maxMinutes: number,
  allowed?: (delay: number) => boolean,
): number[] {
  const max = Number.isFinite(maxMinutes) ? Math.max(0, Math.floor(maxMinutes)) : 60;
  const steps: number[] = DEFAULT_PICKUP_DELAY_STEPS.filter((m) => m <= max);
  const base = steps.length === 0 ? [0] : max > 0 && !steps.includes(max) ? [...steps, max] : steps;
  return allowed ? base.filter(allowed) : base;
}
