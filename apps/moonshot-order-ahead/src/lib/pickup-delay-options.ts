import { pickupDelayFitsLastSlot } from '@moonshot/domain';
import type { CafeHours, CafeHoursOverride } from '@moonshot/types';

/** Candidate delays in minutes; filtered by café maxPickupMinutes. */
export const DEFAULT_PICKUP_DELAY_STEPS = [0, 10, 20, 30, 40, 50, 60] as const;

export type PickupDelayMinutes = number;

export type PickupDelayCafe = {
  timezone: string;
  hours: CafeHours | null | undefined;
  hoursOverrides?: CafeHoursOverride[];
  lastOrderBufferMinutes?: number;
};

export function pickupDelayOptions(
  maxMinutes: number,
  allowed?: (delay: number) => boolean,
): number[] {
  const max = Number.isFinite(maxMinutes) ? Math.max(0, Math.floor(maxMinutes)) : 60;
  const steps: number[] = DEFAULT_PICKUP_DELAY_STEPS.filter((m) => m <= max);
  const base = steps.length === 0 ? [0] : max > 0 && !steps.includes(max) ? [...steps, max] : steps;
  return allowed ? base.filter(allowed) : base;
}

/** Delays that still land before the current session's last-order slot. */
export function pickupDelaysForCafe(
  maxMinutes: number,
  cafe: PickupDelayCafe | null | undefined,
  now: Date = new Date(),
): number[] {
  return pickupDelayOptions(maxMinutes, (delay) =>
    cafe
      ? pickupDelayFitsLastSlot({
          delayMinutes: delay,
          now,
          timezone: cafe.timezone,
          hours: cafe.hours,
          overrides: cafe.hoursOverrides,
          lastOrderBufferMinutes: cafe.lastOrderBufferMinutes,
        })
      : true,
  );
}

/** ASAP (0) when the stored delay is no longer offered near close. */
export function clampPickupDelayMinutes(value: number, options: number[]): number {
  return options.includes(value) ? value : 0;
}
