import { API_VERSION_PREFIX } from '@moonshot/domain';
import type {
  ExtractedMenuPayload,
  MenuEngineeringAnalysisResponse,
  MenuEngineeringEntitlements,
  MenuEngineeringRegionTier,
  MenuEngineeringTier,
} from '@moonshot/types';
import { parseEnvelope, requireApiBaseUrl } from '@moonshot/web-runtime';

/**
 * API origin only (no `/api/v1`). `/runtime-config.js` wins over the Vite
 * build-time value. There is no localhost fallback: a phone visiting the
 * marketing site would call itself and the UI would show "Failed to fetch".
 */
export function getMarketingApiBaseUrl(): string {
  return requireApiBaseUrl(import.meta.env.VITE_API_URL);
}

async function fetchMenuApi(path: string, init?: RequestInit): Promise<Response> {
  const base = getMarketingApiBaseUrl();
  try {
    return await fetch(`${base}${path}`, init);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        `Could not reach the menu API at ${base}. Set VITE_API_URL on the marketing service to the API origin (no /api/v1 suffix) and redeploy.`,
      );
    }
    throw err;
  }
}

async function unwrapEnvelope<T>(res: Response): Promise<T> {
  const payload = await parseEnvelope<T>(res);
  if (!payload.ok) {
    throw new Error(payload.error || `Request failed (${res.status})`);
  }
  return payload.data;
}

export async function fetchSampleMenuExtraction(): Promise<{
  menu: ExtractedMenuPayload;
  entitlements: MenuEngineeringEntitlements;
}> {
  const res = await fetchMenuApi(`${API_VERSION_PREFIX}/menu-engineering/sample`);
  return unwrapEnvelope(res);
}

export async function uploadMenuImagesForExtraction(
  files: readonly File[],
  options?: { turnstileToken?: string; allowSampleFallback?: boolean },
): Promise<{
  menu: ExtractedMenuPayload;
  entitlements: MenuEngineeringEntitlements;
}> {
  const form = new FormData();
  for (const file of files) {
    form.append('images', file, file.name);
  }

  const headers = new Headers();
  if (options?.turnstileToken) {
    form.append('turnstileToken', options.turnstileToken);
    headers.set('X-Turnstile-Token', options.turnstileToken);
  }

  const query = options?.allowSampleFallback ? '?fallback=sample' : '';
  const res = await fetchMenuApi(`${API_VERSION_PREFIX}/menu-engineering/extract${query}`, {
    method: 'POST',
    body: form,
    headers,
  });
  return unwrapEnvelope(res);
}

export async function runMenuEngineeringAnalysis(params: {
  menu: ExtractedMenuPayload;
  regionTier: MenuEngineeringRegionTier;
  tier?: MenuEngineeringTier;
}): Promise<MenuEngineeringAnalysisResponse> {
  const res = await fetchMenuApi(`${API_VERSION_PREFIX}/menu-engineering/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return unwrapEnvelope(res);
}
