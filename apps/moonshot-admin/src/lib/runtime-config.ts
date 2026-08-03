import { getApiBaseUrl as getApiBaseUrlFromRuntime } from '@moonshot/web-runtime';

/** App wrapper — injects Vite build-time env into shared runtime-config. */
export function getApiBaseUrl(): string {
  return getApiBaseUrlFromRuntime(import.meta.env.VITE_API_URL);
}
