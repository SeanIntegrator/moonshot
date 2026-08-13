import { DEFAULT_KDS_AUDIO } from '@moonshot/domain';
import type { KdsConfig, NormalisedOrder } from '@moonshot/types';
import { useEffect, useRef } from 'react';
import { computeOrderTimer } from '../board/useOrderTimer.js';

export type OverdueAlarmAction = 'fire' | 'wait' | 'idle';

export function decideOverdueAlarm(params: {
  overdueCount: number;
  previousCount: number;
  lastFiredAtMs: number | null;
  nowMs: number;
  repeatSeconds: number;
}): OverdueAlarmAction {
  if (params.overdueCount === 0) return 'idle';
  if (params.previousCount === 0) return 'fire';
  if (params.repeatSeconds <= 0) return 'wait';
  if (params.lastFiredAtMs === null) return 'fire';
  if (params.nowMs - params.lastFiredAtMs >= params.repeatSeconds * 1000) return 'fire';
  return 'wait';
}

export function countOverdueTickets(
  orders: readonly NormalisedOrder[],
  dismissingIds: ReadonlySet<string>,
  nowMs: number,
  config: KdsConfig | null,
): number {
  let count = 0;
  for (const order of orders) {
    if (dismissingIds.has(order.id)) continue;
    if (order.status === 'ready') continue;
    if (computeOrderTimer(order, nowMs, config).tone === 'red') count += 1;
  }
  return count;
}

/**
 * Board-level overdue alarm: one tick for the whole board so five red tickets
 * produce one chime, not five. Fires on the empty→non-empty edge, then every
 * `audio.overdueRepeatSeconds` while any non-ready red ticket remains.
 */
export function useOverdueAlarm(params: {
  orders: NormalisedOrder[];
  dismissingIds: ReadonlySet<string>;
  kdsConfig: KdsConfig | null;
  onAlarm: () => void;
}): void {
  const { orders, dismissingIds, kdsConfig, onAlarm } = params;
  const previousCountRef = useRef(0);
  const lastFiredAtRef = useRef<number | null>(null);
  const onAlarmRef = useRef(onAlarm);
  onAlarmRef.current = onAlarm;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const dismissingRef = useRef(dismissingIds);
  dismissingRef.current = dismissingIds;
  const configRef = useRef(kdsConfig);
  configRef.current = kdsConfig;

  useEffect(() => {
    // Refs keep lastFiredAt across board changes; restarting the interval
    // would drop the repeat cadence.
    const tick = (): void => {
      const now = Date.now();
      const config = configRef.current;
      const count = countOverdueTickets(
        ordersRef.current,
        dismissingRef.current,
        now,
        config,
      );
      const action = decideOverdueAlarm({
        overdueCount: count,
        previousCount: previousCountRef.current,
        lastFiredAtMs: lastFiredAtRef.current,
        nowMs: now,
        repeatSeconds: config?.audio.overdueRepeatSeconds ?? DEFAULT_KDS_AUDIO.overdueRepeatSeconds,
      });
      previousCountRef.current = count;
      if (action === 'idle') {
        lastFiredAtRef.current = null;
        return;
      }
      if (action === 'fire') {
        lastFiredAtRef.current = now;
        onAlarmRef.current();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
}
