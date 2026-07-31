/**
 * Hybrid order timer: counts down to a deadline, then counts up past-due in red.
 * POS / walk-up: deadline = createdAt + 4 minutes.
 * Pickup (order-ahead): deadline = pickup.pickupTime (falls back to createdAt + 4m).
 */

import { useEffect, useState } from 'react';
import type { KdsConfig, NormalisedOrder } from '@moonshot/types';

export type FlowTicketKind = 'sit_in' | 'takeaway' | 'pickup';

export type TimerTone = 'green' | 'amber' | 'red';

export interface OrderTimerState {
  /** Signed seconds remaining (negative = past due). */
  remainingSeconds: number;
  /** Absolute value display like `3m`, `1h 15m`, or `2d 3h 15m`. */
  display: string;
  tone: TimerTone;
  pastDue: boolean;
}

const POS_SLA_MS = 4 * 60 * 1000;
/** Switch to amber when this many seconds remain before the deadline. */
const AMBER_REMAINING_SECONDS = 60;

export function deriveTicketKind(order: NormalisedOrder): FlowTicketKind {
  if (order.orderType === 'eat_in') return 'sit_in';
  if (order.source === 'pos') return 'takeaway';
  return 'pickup';
}

export function ticketKindLabel(kind: FlowTicketKind): string {
  switch (kind) {
    case 'sit_in':
      return 'SIT IN';
    case 'takeaway':
      return 'TAKEAWAY';
    case 'pickup':
      return 'PICKUP';
  }
}

export function orderDeadlineMs(order: NormalisedOrder, kind: FlowTicketKind): number {
  const created = Date.parse(order.createdAt);
  if (kind === 'pickup') {
    const pickup = order.pickup.pickupTime ? Date.parse(order.pickup.pickupTime) : NaN;
    if (Number.isFinite(pickup)) return pickup;
  }
  return (Number.isFinite(created) ? created : Date.now()) + POS_SLA_MS;
}

/** Format absolute duration as days / hours / minutes (no seconds). */
export function formatDuration(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const days = Math.floor(abs / 86_400);
  const hours = Math.floor((abs % 86_400) / 3_600);
  const mins = Math.floor((abs % 3_600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(' ');
}

export function computeOrderTimer(
  order: NormalisedOrder,
  nowMs: number,
  _config: KdsConfig | null,
): OrderTimerState {
  const kind = deriveTicketKind(order);
  const deadline = orderDeadlineMs(order, kind);
  const remainingSeconds = Math.round((deadline - nowMs) / 1000);
  const pastDue = remainingSeconds < 0;

  let tone: TimerTone = 'green';
  if (pastDue) {
    tone = 'red';
  } else if (remainingSeconds <= AMBER_REMAINING_SECONDS) {
    tone = 'amber';
  }

  return {
    remainingSeconds,
    display: formatDuration(remainingSeconds),
    tone,
    pastDue,
  };
}

export function useOrderTimer(
  order: NormalisedOrder,
  config: KdsConfig | null,
): OrderTimerState {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return computeOrderTimer(order, nowMs, config);
}
