import {
  API_VERSION_PREFIX,
  type AdminCreateKdsUserRequest,
  type AdminCreateKdsUserResponse,
  type AdminLoginResponse,
  type AdminOnboardingStatusResponse,
  type AdminRegisterRequest,
  type AdminRegisterResponse,
  type AdminSettingsPatchBody,
  type AdminSettingsResponse,
  type AdminStripeAccountLinkResponse,
  type AdminStripeAccountStatusResponse,
  type ApiEnvelope,
  type Cafe,
  type FeatureFlagKey,
  type NormalisedMenu,
  type NormalisedMenuItem,
  type SlugAvailableResponse,
} from '@moonshot/types';

function normalizeApiBaseUrl(raw: string | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  return s.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
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

export type AdminSessionPayload = Pick<AdminLoginResponse, 'adminUser' | 'cafe'>;

export type AdminMeResponse = AdminSessionPayload;

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');

  const url = `${base}${API_VERSION_PREFIX}/admin/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const envelope = await parseEnvelope<AdminLoginResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Login failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminGetMe(token: string): Promise<AdminMeResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');

  const url = `${base}${API_VERSION_PREFIX}/admin/auth/me`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const envelope = await parseEnvelope<AdminMeResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Session invalid (${res.status})`);
  }
  return envelope.data;
}

export type PublicCafePayload = {
  cafe: Cafe;
  activeFeatures: FeatureFlagKey[];
};

export async function fetchPublicCafe(slug: string): Promise<PublicCafePayload> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');

  const url = `${base}${API_VERSION_PREFIX}/cafe/${encodeURIComponent(slug)}`;
  const res = await fetch(url);
  const envelope = await parseEnvelope<PublicCafePayload>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Failed to load café (${res.status})`);
  }
  return envelope.data;
}

export async function patchAdminSettings(
  token: string,
  body: AdminSettingsPatchBody,
): Promise<AdminSettingsResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');

  const url = `${base}${API_VERSION_PREFIX}/admin/settings`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<AdminSettingsResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Save failed (${res.status})`);
  }
  return envelope.data;
}

export async function fetchMenuForCafe(slug: string): Promise<NormalisedMenu> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');

  const url = `${base}${API_VERSION_PREFIX}/menu`;
  const res = await fetch(url, { headers: { 'X-Cafe-Slug': slug } });
  const envelope = await parseEnvelope<NormalisedMenu>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Failed to load menu (${res.status})`);
  }
  return envelope.data;
}

export async function patchMenuItem(
  token: string,
  cafeSlug: string,
  itemId: string,
  body: Record<string, unknown>,
): Promise<NormalisedMenuItem> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');

  const url = `${base}${API_VERSION_PREFIX}/menu/${encodeURIComponent(itemId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<NormalisedMenuItem>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Update failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminStripeOnboardingLink(token: string): Promise<AdminStripeAccountLinkResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/admin/payments/stripe/onboarding-link`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await parseEnvelope<AdminStripeAccountLinkResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Stripe link failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminStripeStatus(token: string): Promise<AdminStripeAccountStatusResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/admin/payments/stripe/status`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const envelope = await parseEnvelope<AdminStripeAccountStatusResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Stripe status failed (${res.status})`);
  }
  return envelope.data;
}

export async function checkSlugAvailable(slug: string): Promise<SlugAvailableResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/admin/onboarding/slug-available?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url);
  const envelope = await parseEnvelope<SlugAvailableResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Slug check failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminRegister(body: AdminRegisterRequest): Promise<AdminRegisterResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/admin/onboarding/register`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<AdminRegisterResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Registration failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminOnboardingStatus(token: string): Promise<AdminOnboardingStatusResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/admin/onboarding/status`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const envelope = await parseEnvelope<AdminOnboardingStatusResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Status failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminCompleteOnboarding(token: string): Promise<void> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/admin/onboarding/complete`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await parseEnvelope<{ completed: boolean }>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Complete failed (${res.status})`);
  }
}

export async function adminCreateKdsUser(
  token: string,
  body: AdminCreateKdsUserRequest,
): Promise<AdminCreateKdsUserResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/admin/onboarding/kds-users`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<AdminCreateKdsUserResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `KDS user failed (${res.status})`);
  }
  return envelope.data;
}

export async function createMenuItem(
  token: string,
  cafeSlug: string,
  body: { name: string; category: string; priceMinor: number; description?: string },
): Promise<NormalisedMenuItem> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/menu`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Cafe-Slug': cafeSlug,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<NormalisedMenuItem>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Create menu item failed (${res.status})`);
  }
  return envelope.data;
}

