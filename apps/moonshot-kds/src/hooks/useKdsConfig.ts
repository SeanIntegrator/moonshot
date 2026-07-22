import { useCallback, useEffect, useState } from 'react';
import type { KdsConfig } from '@moonshot/types';
import { kdsFetchConfig } from '../lib/kds-api.js';
import type { KdsSession } from '../lib/kds-session.js';

export function useKdsConfig(params: {
  session: KdsSession | null;
  onSessionExpired: (session: KdsSession) => void;
}): {
  kdsConfig: KdsConfig | null;
  error: string | null;
  setError: (error: string | null) => void;
} {
  const { session, onSessionExpired } = params;
  const [kdsConfig, setKdsConfig] = useState<KdsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (current: KdsSession) => {
      const data = await kdsFetchConfig(current.token);
      setKdsConfig(data.kdsConfig);
    },
    [],
  );

  useEffect(() => {
    if (!session) {
      setKdsConfig(null);
      return;
    }
    setError(null);
    void load(session).catch((e) => {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
        onSessionExpired(session);
        setError('Session expired — please sign in again.');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load KDS config');
    });
  }, [session, load, onSessionExpired]);

  return { kdsConfig, error, setError };
}
