import { useEffect, useRef, useState } from 'react';
import {
  RealtimeConnection,
  type RealtimeConnectionOptions,
  type RealtimeStatus,
} from './connection.js';

export type { RealtimeStatus, RealtimeConnectionOptions };
export { RealtimeConnection };

export const REALTIME_DEGRADED_GRACE_MS = 8_000;

export type UseRealtimeConnectionOptions = RealtimeConnectionOptions & {
  enabled?: boolean;
};

export function useRealtimeConnection(options: UseRealtimeConnectionOptions): {
  status: RealtimeStatus;
  isConnected: boolean;
  connection: RealtimeConnection | null;
} {
  const { baseUrl, namespace, enabled = true, resumeOnVisibility } = options;
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [connection, setConnection] = useState<RealtimeConnection | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!enabled || !baseUrl) {
      setStatus('idle');
      setConnection(null);
      return;
    }

    const conn = new RealtimeConnection({
      baseUrl,
      namespace,
      resumeOnVisibility,
      auth: optionsRef.current.auth
        ? () => optionsRef.current.auth?.() ?? {}
        : undefined,
      onStatusChange: (next) => {
        setStatus(next);
        optionsRef.current.onStatusChange?.(next);
      },
      onConnect: (ctx) => optionsRef.current.onConnect?.(ctx),
      onAuthError: (err) => optionsRef.current.onAuthError?.(err),
      onResume: () => optionsRef.current.onResume?.(),
    });
    setConnection(conn);
    setStatus('connecting');
    conn.connect();

    return () => {
      conn.destroy();
      setConnection(null);
    };
  }, [enabled, baseUrl, namespace, resumeOnVisibility]);

  return { status, isConnected: status === 'connected', connection };
}

const IMMEDIATE_STATUSES: ReadonlySet<RealtimeStatus> = new Set([
  'connected',
  'idle',
  'unauthorized',
]);

/**
 * Hold `connected` for `graceMs` after a drop so a one-second blip never
 * paints a reconnecting chip. Unauthorized / idle apply immediately.
 */
export function useGracedStatus(
  status: RealtimeStatus,
  graceMs: number = REALTIME_DEGRADED_GRACE_MS,
): RealtimeStatus {
  const [graced, setGraced] = useState<RealtimeStatus>(status);

  useEffect(() => {
    if (IMMEDIATE_STATUSES.has(status)) {
      setGraced(status);
      return;
    }

    let applyNow = false;
    setGraced((current) => {
      if (current !== 'connected') {
        applyNow = true;
        return status;
      }
      return current;
    });
    if (applyNow) return;

    const timer = setTimeout(() => setGraced(status), graceMs);
    return () => clearTimeout(timer);
  }, [status, graceMs]);

  return graced;
}
