function normalizeApiBaseUrl(raw: string | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  return s.replace(/\/+$/, '');
}

declare global {
  interface Window {
    __MOONSHOT_RUNTIME__?: { apiUrl?: string };
  }
}

/**
 * Runtime config from dist/runtime-config.js (Railway start) beats stale Vite build env.
 * Pass `buildTimeUrl` from the app (`import.meta.env.VITE_API_URL`) — packages cannot
 * read Vite env at publish time.
 */
export function getApiBaseUrl(buildTimeUrl?: string): string {
  const runtime =
    typeof window !== 'undefined' ? window.__MOONSHOT_RUNTIME__?.apiUrl : undefined;
  const fromRuntime = normalizeApiBaseUrl(runtime);
  if (fromRuntime) return fromRuntime;
  return normalizeApiBaseUrl(buildTimeUrl);
}

export function requireApiBaseUrl(buildTimeUrl?: string): string {
  const base = getApiBaseUrl(buildTimeUrl);
  if (!base) throw new Error('VITE_API_URL is not set');
  return base;
}
