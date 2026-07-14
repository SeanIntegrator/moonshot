function normalizeApiBaseUrl(raw: string | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  return s.replace(/\/+$/, '');
}

/** Runtime config from dist/runtime-config.js (Railway start) beats stale Vite build env. */
export function getApiBaseUrl(): string {
  const runtime = window.__MOONSHOT_RUNTIME__?.apiUrl;
  const fromRuntime = normalizeApiBaseUrl(runtime);
  if (fromRuntime) return fromRuntime;
  return normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
}
