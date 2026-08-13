import type { KdsServerToClientEvent } from '@moonshot/types';
import { KDS_SOCKET_NAMESPACE } from '@moonshot/domain';
import { useRealtimeConnection } from '@moonshot/web-runtime/react';
import type { RealtimeStatus } from '@moonshot/web-runtime';
import { useEffect, useRef } from 'react';
import { getApiBaseUrl } from '../lib/kds-api.js';

export function useKdsRealtime(params: {
  enabled: boolean;
  token: string | null;
  onEvent: (ev: KdsServerToClientEvent) => void;
  onResync: () => void;
  onAuthError: () => void;
}): {
  status: RealtimeStatus;
  isConnected: boolean;
} {
  const { enabled, token, onEvent, onResync, onAuthError } = params;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onResyncRef = useRef(onResync);
  onResyncRef.current = onResync;
  const onAuthErrorRef = useRef(onAuthError);
  onAuthErrorRef.current = onAuthError;
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const baseUrl = getApiBaseUrl();

  const { status, isConnected, connection } = useRealtimeConnection({
    enabled: enabled && Boolean(token) && Boolean(baseUrl),
    baseUrl,
    namespace: KDS_SOCKET_NAMESPACE,
    auth: () => ({ token: tokenRef.current ?? '' }),
    onConnect: ({ recovered }) => {
      if (!recovered) onResyncRef.current();
    },
    onAuthError: () => onAuthErrorRef.current(),
    onResume: () => onResyncRef.current(),
  });

  useEffect(() => {
    if (!connection) return;
    const handler = (...args: unknown[]) => {
      onEventRef.current(args[0] as KdsServerToClientEvent);
    };
    connection.on('kds:event', handler);
    return () => connection.off('kds:event', handler);
  }, [connection]);

  return { status, isConnected };
}
