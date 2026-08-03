import type { AdminServerToClientEvent } from '@moonshot/types';
import { ADMIN_SOCKET_NAMESPACE } from '@moonshot/domain';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from '../lib/admin-api.js';
import { getSquareConnectStatus } from '../lib/admin-api.js';

const RECONCILE_MS = 60_000;

type Options = {
  token: string;
  enabled: boolean;
  onMenuSynced: (event: Extract<AdminServerToClientEvent, { type: 'admin:menu:synced' }>) => void;
  /** Fallback when sockets drop — poll status timestamp. */
  onReconcileSyncDetected: () => void;
  knownSyncedAt: string | null;
};

/**
 * Subscribe to `/admin` menu-sync pushes; fall back to 60s status reconcile.
 */
export function useAdminMenuSync({
  token,
  enabled,
  onMenuSynced,
  onReconcileSyncDetected,
  knownSyncedAt,
}: Options): void {
  const syncedAtRef = useRef(knownSyncedAt);
  syncedAtRef.current = knownSyncedAt;
  const onMenuSyncedRef = useRef(onMenuSynced);
  onMenuSyncedRef.current = onMenuSynced;
  const onReconcileRef = useRef(onReconcileSyncDetected);
  onReconcileRef.current = onReconcileSyncDetected;

  useEffect(() => {
    if (!enabled || !token) return;

    let cancelled = false;
    let socket: Socket | null = null;

    try {
      socket = io(`${getApiBaseUrl()}${ADMIN_SOCKET_NAMESPACE}`, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('admin:event', (ev: AdminServerToClientEvent) => {
        if (cancelled) return;
        if (ev.type === 'admin:menu:synced') {
          syncedAtRef.current = ev.syncedAt;
          onMenuSyncedRef.current(ev);
        }
      });
    } catch {
      // Socket unavailable — reconcile interval still runs.
    }

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const next = await getSquareConnectStatus(token);
          if (cancelled) return;
          const prev = syncedAtRef.current;
          if (next.catalogLastSyncedAt && next.catalogLastSyncedAt !== prev) {
            syncedAtRef.current = next.catalogLastSyncedAt;
            onReconcileRef.current();
          }
        } catch {
          // ignore transient reconcile errors
        }
      })();
    }, RECONCILE_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, [enabled, token]);
}
