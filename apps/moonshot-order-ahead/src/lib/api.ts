import { API_VERSION_PREFIX, type ApiEnvelope } from '@moonshot/types';

const TOKEN_KEY = 'moonshot_jwt';

/** Avoid `//api` when composing `${base}${API_VERSION_PREFIX}`. */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  return s.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
}

async function parseApiEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();
  const start = text.trimStart();
  if (
    contentType.includes('text/html') ||
    start.startsWith('<') ||
    start.toLowerCase().startsWith('<!doctype')
  ) {
    throw new Error(
      'Server returned HTML instead of JSON. Set VITE_API_URL to the API origin (e.g. http://localhost:3000), not the Vite dev server URL.',
    );
  }
  let parsed: unknown;
  try {
    parsed = text.length ? JSON.parse(text) : null;
  } catch {
    throw new Error('Invalid JSON from API');
  }
  return parsed as ApiEnvelope<T>;
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
  const json = await parseApiEnvelope<T>(res);
  if (!json.ok) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data;
}
