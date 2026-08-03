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
