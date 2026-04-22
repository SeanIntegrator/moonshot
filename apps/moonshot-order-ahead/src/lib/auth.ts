import { API_VERSION_PREFIX } from '@moonshot/types';
import { getApiBaseUrl, getCafeSlug, setStoredToken } from './api.js';

export type GoogleCredentialResponse = { credential: string; select_by?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (momentNotification?: (notification?: unknown) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              width?: string;
            },
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

/** GIS often attaches `window.google` shortly after the script element fires `load`. */
async function waitForGoogleAccountsId(timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.google?.accounts?.id) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Google Identity Services not available');
}

export async function loadGisScript(): Promise<void> {
  if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(s);
    });
  }
  await waitForGoogleAccountsId();
}

export async function exchangeGoogleCredential(credential: string): Promise<void> {
  const base = getApiBaseUrl();
  const cafeSlug = getCafeSlug();
  const res = await fetch(`${base}${API_VERSION_PREFIX}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, cafeSlug }),
  });
  const json = (await res.json()) as { ok: boolean; data?: { token: string }; error?: string };
  if (!json.ok || !json.data?.token) {
    throw new Error(json.error ?? 'Google sign-in failed');
  }
  setStoredToken(json.data.token);
}

let gsiInitializedForClient: string | null = null;

/** Single `accounts.id.initialize` per client id (GIS requirement). */
export async function ensureGoogleInitialized(
  clientId: string,
  onCredential: (credential: string) => Promise<void>,
): Promise<void> {
  if (gsiInitializedForClient === clientId) return;
  await loadGisScript();
  const google = window.google;
  if (!google?.accounts?.id) {
    throw new Error('Google Identity Services not available (blocked or timed out)');
  }
  google.accounts.id.initialize({
    client_id: clientId,
    callback: async (resp) => {
      await onCredential(resp.credential);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  gsiInitializedForClient = clientId;
}

export function promptGoogleOneTap(): void {
  window.google?.accounts?.id?.prompt();
}

export async function initGoogleOneTap(
  clientId: string,
  onSignedIn: () => void,
): Promise<void> {
  await ensureGoogleInitialized(clientId, async (credential) => {
    await exchangeGoogleCredential(credential);
    onSignedIn();
  });
  promptGoogleOneTap();
}

export { setStoredToken } from './api.js';
