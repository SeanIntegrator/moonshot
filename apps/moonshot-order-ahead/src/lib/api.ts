import { API_VERSION_PREFIX, type ApiEnvelope } from '@moonshot/types';

const TOKEN_KEY = 'moonshot_jwt';

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? '';
}

export function getCafeSlug(): string {
  return import.meta.env.VITE_CAFE_SLUG ?? 'clay-and-bean';
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
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

  const res = await fetch(url, { ...init, headers });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!json.ok) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data;
}
