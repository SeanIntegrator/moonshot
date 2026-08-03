import { API_VERSION_PREFIX } from '@moonshot/domain';
import type { ApiEnvelope } from '@moonshot/types';

export type ParseEnvelopeMode = 'throw' | 'soft';

/**
 * Parse an API JSON envelope from a fetch Response.
 * - `throw` (default): HTML / invalid JSON throw — used by KDS and order-ahead.
 * - `soft`: returns `{ ok: false, error }` — used by admin forms that display inline errors.
 */
export async function parseEnvelope<T>(
  res: Response,
  mode: ParseEnvelopeMode = 'throw',
): Promise<ApiEnvelope<T>> {
  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();
  const start = text.trimStart();
  const isHtml =
    contentType.includes('text/html') ||
    start.startsWith('<') ||
    start.toLowerCase().startsWith('<!doctype');

  if (isHtml) {
    const error =
      'Server returned HTML. Set VITE_API_URL to the API origin (e.g. http://localhost:3000).';
    if (mode === 'soft') return { ok: false, error, code: undefined };
    throw new Error(error);
  }

  let parsed: unknown;
  try {
    parsed = text.length ? JSON.parse(text) : null;
  } catch {
    if (mode === 'soft') {
      return { ok: false, error: 'Invalid JSON from server', code: undefined };
    }
    throw new Error('Invalid JSON from API');
  }

  return parsed as ApiEnvelope<T>;
}

export function apiUrl(base: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${API_VERSION_PREFIX}${p}`;
}
