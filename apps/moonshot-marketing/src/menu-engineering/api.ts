import { API_VERSION_PREFIX } from '@moonshot/domain';
import type {
  ApiEnvelope,
  ExtractedMenuPayload,
  MenuEngineeringAnalysisResponse,
  MenuEngineeringEntitlements,
  MenuEngineeringRegionTier,
  MenuEngineeringTier,
} from '@moonshot/types';
import { getApiBaseUrl } from '@moonshot/web-runtime';

export function getMarketingApiBaseUrl(): string {
  const configured = getApiBaseUrl(import.meta.env.VITE_API_URL);
  return configured || 'http://localhost:3000';
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  const payload = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !payload.ok) {
    const errMsg = !payload.ok ? payload.error : `Request failed (${res.status})`;
    throw new Error(errMsg);
  }
  return payload.data;
}

export async function fetchSampleMenuExtraction(): Promise<{
  menu: ExtractedMenuPayload;
  entitlements: MenuEngineeringEntitlements;
}> {
  const base = getMarketingApiBaseUrl();
  const res = await fetch(`${base}${API_VERSION_PREFIX}/menu-engineering/sample`);
  return parseEnvelope(res);
}

export async function uploadMenuImagesForExtraction(
  files: readonly File[],
  options?: { turnstileToken?: string; allowSampleFallback?: boolean },
): Promise<{
  menu: ExtractedMenuPayload;
  entitlements: MenuEngineeringEntitlements;
}> {
  const base = getMarketingApiBaseUrl();
  const form = new FormData();
  for (const file of files) {
    form.append('images', file, file.name);
  }
  if (options?.turnstileToken) {
    form.append('turnstileToken', options.turnstileToken);
  }

  const query = options?.allowSampleFallback ? '?fallback=sample' : '';
  const res = await fetch(
    `${base}${API_VERSION_PREFIX}/menu-engineering/extract${query}`,
    {
      method: 'POST',
      body: form,
    },
  );
  return parseEnvelope(res);
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
  return parseEnvelope(res);
}
