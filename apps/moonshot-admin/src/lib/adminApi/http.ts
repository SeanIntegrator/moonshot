import { API_VERSION_PREFIX, type ApiEnvelope } from '@moonshot/types';
import { getApiBaseUrl } from '../runtime-config.js';

export { getApiBaseUrl };

export function requireApiBase(): string {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  return base;
}

export function apiUrl(path: string): string {
  return `${requireApiBase()}${API_VERSION_PREFIX}${path}`;
}

export async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();
  const start = text.trimStart();
  if (contentType.includes('text/html') || start.startsWith('<!')) {
    return {
      ok: false,
      error:
        'Server returned HTML. Set VITE_API_URL to the API origin (e.g. http://localhost:3000).',
      code: undefined,
    };
  }
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return { ok: false, error: 'Invalid JSON from server', code: undefined };
  }
}
