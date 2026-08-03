import { API_VERSION_PREFIX } from '@moonshot/domain';
import { parseEnvelope, getPersistentToken, setPersistentToken } from '@moonshot/web-runtime';
import { ConnectivityError } from './network-error.js';
import { getApiBaseUrl } from './runtime-config.js';

export { getApiBaseUrl };

const TOKEN_KEY = 'moonshot_jwt';

export function getCafeSlug(): string {
  if (runtimeCafeSlug) return runtimeCafeSlug;
  const fromEnv = import.meta.env.VITE_CAFE_SLUG?.trim();
  if (fromEnv) return fromEnv;
  // Root `/` redirect only — CaféProvider always sets the URL slug for real routes.
  return 'unknown';
}

let runtimeCafeSlug: string | null = null;

/**
 * Module-level slug for `X-Cafe-Slug` on `apiFetch`. Set synchronously from
 * `CafeProvider` render (not only in useEffect) so child effects such as
 * `CheckoutRestore` hit the API with the URL slug on first paint.
 */
export function setRuntimeCafeSlug(slug: string | null): void {
  runtimeCafeSlug = slug;
}

/** Customer JWT — localStorage survives Stripe-hosted checkout redirects; sessionStorage is legacy fallback. */
export function getStoredToken(): string | null {
  return getPersistentToken(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  setPersistentToken(TOKEN_KEY, token);
}

export function clearToken(): void {
  setStoredToken(null);
}

/**
 * Typed fetch against `/api/v1/...` with JWT + café slug headers.
 * @param path — e.g. `/auth/me` (prefix is added automatically)
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${API_VERSION_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const slug = getCafeSlug();
  if (slug) headers.set('X-Cafe-Slug', slug);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (e) {
    // Aborts are intentional (slug change / StrictMode remount) — not connectivity.
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new ConnectivityError();
  }
  const json = await parseEnvelope<T>(res, 'throw');
  if (!json.ok) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data;
}
