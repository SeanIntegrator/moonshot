import type { AdminServerToClientEvent } from '@moonshot/types';
import { ADMIN_SOCKET_NAMESPACE } from '@moonshot/domain';
import { useRealtimeConnection } from '@moonshot/web-runtime/react';
import { useEffect, useRef } from 'react';
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
 * A non-recovered reconnect triggers an immediate reconcile instead of waiting
 * for the next poll tick.
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
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const baseUrl = getApiBaseUrl();
  const { connection } = useRealtimeConnection({
    enabled: enabled && Boolean(token) && Boolean(baseUrl),
    baseUrl,
    namespace: ADMIN_SOCKET_NAMESPACE,
    auth: () => ({ token: tokenRef.current }),
    onConnect: ({ recovered }) => {
      if (!recovered) onReconcileRef.current();
    },
  });

  useEffect(() => {
    if (!connection) return;
    const handler = (...args: unknown[]) => {
      const ev = args[0] as AdminServerToClientEvent;
      if (ev.type === 'admin:menu:synced') {
        syncedAtRef.current = ev.syncedAt;
        onMenuSyncedRef.current(ev);
      }
    };
    connection.on('admin:event', handler);
    return () => connection.off('admin:event', handler);
  }, [connection]);

  useEffect(() => {
    if (!enabled || !token) return;
    let cancelled = false;

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
    };
  }, [enabled, token]);
}
