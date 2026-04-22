import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { ensureGoogleInitialized, exchangeGoogleCredential, promptGoogleOneTap } from '../../lib/auth.js';

/**
 * Initializes GIS (if not already) and shows the One Tap prompt once.
 * Requires `VITE_GOOGLE_CLIENT_ID`.
 */
export function GoogleOneTap() {
  const { refresh } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || clientId.includes('your-google-oauth')) return;
    let cancelled = false;
    let timeoutId = 0;
    void (async () => {
      try {
        await ensureGoogleInitialized(clientId, async (credential) => {
          await exchangeGoogleCredential(credential);
          await refresh();
        });
      } catch (e) {
        console.warn('[GoogleOneTap]', e instanceof Error ? e.message : e);
        return;
      }
      if (cancelled) return;
      timeoutId = window.setTimeout(() => {
        promptGoogleOneTap();
      }, 0);
    })();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [clientId, refresh]);

  return null;
}
