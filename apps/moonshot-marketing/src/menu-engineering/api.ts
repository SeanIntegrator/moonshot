import { API_VERSION_PREFIX } from '@moonshot/domain';
import type {
  ExtractedMenuPayload,
  MenuEngineeringAnalysisResponse,
  MenuEngineeringEntitlements,
  MenuEngineeringRegionTier,
  MenuEngineeringTier,
} from '@moonshot/types';
import { parseEnvelope, requireApiBaseUrl } from '@moonshot/web-runtime';

/** Runtime `/runtime-config.js` wins; otherwise the Vite build-time API origin. */
export function getMarketingApiBaseUrl(): string {
  return requireApiBaseUrl(import.meta.env.VITE_API_URL);
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
  const base = getMarketingApiBaseUrl();
  const res = await fetch(`${base}${API_VERSION_PREFIX}/menu-engineering/sample`);
  return unwrapEnvelope(res);
}

export async function uploadMenuImagesForExtraction(
  files: readonly File[],
  options?: { turnstileToken?: string; allowSampleFallback?: boolean }
): Promise<{
  menu: ExtractedMenuPayload;
  entitlements: MenuEngineeringEntitlements;
}> {
  const base = getMarketingApiBaseUrl();
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
  const res = await fetch(`${base}${API_VERSION_PREFIX}/menu-engineering/extract${query}`, {
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
  const base = getMarketingApiBaseUrl();
  const res = await fetch(`${base}${API_VERSION_PREFIX}/menu-engineering/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return unwrapEnvelope(res);
}
