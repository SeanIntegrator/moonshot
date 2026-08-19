import type { ApiEnvelope } from '@moonshot/types';
import { apiUrl as buildApiUrl, parseEnvelope, requireApiBaseUrl } from '@moonshot/web-runtime';
import { getApiBaseUrl } from '../runtime-config.js';

export { getApiBaseUrl };

export function requireApiBase(): string {
  return requireApiBaseUrl(import.meta.env.VITE_API_URL);
}

export function apiUrl(path: string): string {
  return buildApiUrl(requireApiBase(), path);
}

export async function parseEnvelopeSoft<T>(res: Response): Promise<ApiEnvelope<T>> {
  return parseEnvelope<T>(res, 'soft');
}

/** Historical name — soft mode for admin inline error handling. */
export { parseEnvelopeSoft as parseEnvelope };

type AdminFetchOptions = {
  token: string;
  cafeSlug?: string;
  method?: string;
  json?: unknown;
  formData?: FormData;
  errorMessage?: string;
};

export async function adminFetch<T>(path: string, opts: AdminFetchOptions): Promise<T> {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${opts.token}`);
  if (opts.cafeSlug) headers.set('X-Cafe-Slug', opts.cafeSlug);

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(opts.json);
  }

  const res = await fetch(apiUrl(path), {
    method: opts.method ?? 'GET',
    headers,
    body,
  });
  const envelope = await parseEnvelope<T>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `${opts.errorMessage ?? 'Request failed'} (${res.status})`);
  }
  return envelope.data;
}
