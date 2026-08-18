import type {
  AdminSettingsPatchBody,
  AdminSettingsResponse,
  Cafe,
  CafeHoursOverride,
  FeatureFlagKey,
  PauseDuration,
} from '@moonshot/types';
import { apiUrl, parseEnvelope } from './http.js';

export type PublicCafePayload = {
  cafe: Cafe;
  activeFeatures: FeatureFlagKey[];
};

async function adminSettingsRequest(
  token: string,
  path: string,
  init: RequestInit,
): Promise<AdminSettingsResponse> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const envelope = await parseEnvelope<AdminSettingsResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Request failed (${res.status})`);
  }
  return envelope.data;
}

export async function fetchPublicCafe(slug: string): Promise<PublicCafePayload> {
  const res = await fetch(apiUrl(`/cafe/${encodeURIComponent(slug)}`));
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
  return adminSettingsRequest(token, '/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function pauseCafeOrders(
  token: string,
  duration: PauseDuration,
): Promise<AdminSettingsResponse> {
  return adminSettingsRequest(token, '/admin/service/pause', {
    method: 'POST',
    body: JSON.stringify({ duration }),
  });
}

export async function resumeCafeOrders(token: string): Promise<AdminSettingsResponse> {
  return adminSettingsRequest(token, '/admin/service/resume', { method: 'POST' });
}

export async function extendCafePause(token: string): Promise<AdminSettingsResponse> {
  return adminSettingsRequest(token, '/admin/service/extend', {
    method: 'POST',
    body: JSON.stringify({ minutes: 15 }),
  });
}

export async function upsertHoursOverride(
  token: string,
  body: Pick<CafeHoursOverride, 'date' | 'label' | 'closed' | 'intervals'>,
): Promise<AdminSettingsResponse> {
  return adminSettingsRequest(token, '/admin/hours/overrides', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteHoursOverride(
  token: string,
  date: string,
): Promise<AdminSettingsResponse> {
  return adminSettingsRequest(token, `/admin/hours/overrides/${encodeURIComponent(date)}`, {
    method: 'DELETE',
  });
}
