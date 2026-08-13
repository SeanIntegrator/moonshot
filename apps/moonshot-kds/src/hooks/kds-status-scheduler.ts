import type { KdsAdvanceStatusRequest, KdsAdvanceStatusResponse, NormalisedOrder, OrderStatus } from '@moonshot/types';
import type { Dispatch, SetStateAction } from 'react';
import { kdsAdvanceOrderStatus } from '../lib/kds-api.js';
import { sortOrders } from '../lib/orders-store.js';

const STATUS_DEBOUNCE_MS = 250;

type AdvanceStatus = KdsAdvanceStatusRequest['status'];

type PendingStatusEntry = {
  /** Status the UI currently shows / last scheduled target. */
  target: AdvanceStatus;
  /** Status before the first optimistic write in this debounce window. */
  rollback: OrderStatus;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
};

export type AdvanceStatusFn = (
  token: string,
  orderId: string,
  status: AdvanceStatus,
) => Promise<KdsAdvanceStatusResponse>;

/**
 * Per-order status scheduler: optimistic UI, debounce coalescing, and
 * idempotent POSTs so rapid line toggles settle to one network call.
 */
export function createStatusScheduler(opts: {
  getToken: () => string | null;
  setOrders: Dispatch<SetStateAction<NormalisedOrder[]>>;
  setError: (error: string | null) => void;
  onSessionExpired: () => void;
  advanceStatus?: AdvanceStatusFn;
}) {
  const pending = new Map<string, PendingStatusEntry>();
  const advance = opts.advanceStatus ?? kdsAdvanceOrderStatus;

  function hasPending(orderId: string): boolean {
    return pending.has(orderId);
  }

  function flush(orderId: string): void {
    const entry = pending.get(orderId);
    if (!entry || entry.inFlight) return;

    const token = opts.getToken();
    if (!token) {
      pending.delete(orderId);
      return;
    }

    entry.inFlight = true;
    entry.timer = null;
    const target = entry.target;

    void advance(token, orderId, target)
      .then(({ order }) => {
        const current = pending.get(orderId);
        if (!current) {
          opts.setOrders((prev) => sortOrders([...prev.filter((o) => o.id !== order.id), order]));
          return;
        }

        // A newer target was scheduled while we were in flight — apply server
        // payload fields but keep optimistic status, then flush the new target.
        if (current.target !== target) {
          current.inFlight = false;
          current.rollback = order.status;
          opts.setOrders((prev) =>
            sortOrders([...prev.filter((o) => o.id !== order.id), { ...order, status: current.target }]),
          );
          flush(orderId);
          return;
        }

        pending.delete(orderId);
        opts.setOrders((prev) => sortOrders([...prev.filter((o) => o.id !== order.id), order]));
      })
      .catch((err) => {
        const current = pending.get(orderId);
        const rollback = current?.rollback;
        pending.delete(orderId);

        if (rollback !== undefined) {
          opts.setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: rollback } : o)),
          );
        }

        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          opts.onSessionExpired();
          opts.setError('Session expired — please sign in again.');
        } else {
          opts.setError(err instanceof Error ? err.message : 'Status update failed');
        }
      });
  }

  function schedule(
    orderId: string,
    status: AdvanceStatus,
    currentStatus: OrderStatus | undefined,
  ): void {
    const existing = pending.get(orderId);

    // Idempotent: already showing / targeting this status — nothing to do.
    if (existing) {
      if (existing.target === status) return;
      if (existing.timer) clearTimeout(existing.timer);
      existing.target = status;
      existing.timer = setTimeout(() => flush(orderId), STATUS_DEBOUNCE_MS);
      opts.setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      return;
    }

    if (currentStatus === status) return;

    pending.set(orderId, {
      target: status,
      rollback: currentStatus ?? status,
      timer: setTimeout(() => flush(orderId), STATUS_DEBOUNCE_MS),
      inFlight: false,
    });

    opts.setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  function clearAll(): void {
    for (const entry of pending.values()) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    pending.clear();
  }

  return { schedule, hasPending, clearAll };
}

export type StatusScheduler = ReturnType<typeof createStatusScheduler>;
