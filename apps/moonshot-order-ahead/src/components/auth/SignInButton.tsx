import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { ensureGoogleInitialized, exchangeGoogleCredential } from '../../lib/auth.js';

/** Renders the official Google Sign-In button (GIS `renderButton`). */
export function SignInButton() {
  const ref = useRef<HTMLDivElement>(null);
  const { refresh } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || clientId.includes('your-google-oauth') || !ref.current) return;
    const el = ref.current;
    void (async () => {
      try {
        await ensureGoogleInitialized(clientId, async (credential) => {
          await exchangeGoogleCredential(credential);
          await refresh();
        });
      } catch (e) {
        console.warn('[SignInButton]', e instanceof Error ? e.message : e);
        return;
      }
      window.google?.accounts?.id?.renderButton(el, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: '280',
      });
    })();
  }, [clientId, refresh]);

  if (!clientId || clientId.includes('your-google-oauth')) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Set a real VITE_GOOGLE_CLIENT_ID to enable sign-in.</p>;
  }

  return <div ref={ref} />;
}
