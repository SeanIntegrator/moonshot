import { useEffect, useMemo, useState } from 'react';
import { pickupDelaysForCafe } from '../lib/pickup-delay-options.js';
import { useCafe } from './useCafe.js';

/** Last-order cut-off is wall-clock minutes; refresh often enough to drop stale slots. */
export const PICKUP_DELAY_OPTIONS_TICK_MS = 15_000;

/**
 * Last-order-filtered pickup delays for the current café clock.
 * `enabled: false` when a parent already owns the clock and passes `allowedDelays`.
 */
export function usePickupDelayOptions(
  maxPickupMinutes: number,
  params: { enabled?: boolean } = {},
): number[] {
  const enabled = params.enabled !== false;
  const { cafe } = useCafe();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, PICKUP_DELAY_OPTIONS_TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [enabled]);

  return useMemo(
    () => pickupDelaysForCafe(maxPickupMinutes, cafe, now),
    [maxPickupMinutes, cafe, now],
  );
}
