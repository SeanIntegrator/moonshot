import type {
  AdminSettingsPatchBody,
  AdminSettingsResponse,
  Cafe,
  CafeHoursOverride,
  FeatureFlagKey,
  PauseDuration,
} from '@moonshot/types';
import { adminFetch, apiUrl, parseEnvelope } from './http.js';

export type PublicCafePayload = {
  cafe: Cafe;
  activeFeatures: FeatureFlagKey[];
  isOpen?: boolean;
  hoursCaption?: string;
};

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
  return adminFetch<AdminSettingsResponse>('/admin/settings', {
    token,
    method: 'PATCH',
    json: body,
  });
}

export async function pauseCafeOrders(
  token: string,
  duration: PauseDuration,
): Promise<AdminSettingsResponse> {
  return adminFetch<AdminSettingsResponse>('/admin/service/pause', {
    token,
    method: 'POST',
    json: { duration },
  });
}

export async function resumeCafeOrders(token: string): Promise<AdminSettingsResponse> {
  return adminFetch<AdminSettingsResponse>('/admin/service/resume', {
    token,
    method: 'POST',
  });
}

export async function extendCafePause(token: string): Promise<AdminSettingsResponse> {
  return adminFetch<AdminSettingsResponse>('/admin/service/extend', {
    token,
    method: 'POST',
    json: { minutes: 15 },
  });
}

export async function upsertHoursOverride(
  token: string,
  body: Pick<CafeHoursOverride, 'date' | 'label' | 'closed' | 'intervals'>,
): Promise<AdminSettingsResponse> {
  return adminFetch<AdminSettingsResponse>('/admin/hours/overrides', {
    token,
    method: 'PUT',
    json: body,
  });
}

export async function deleteHoursOverride(
  token: string,
  date: string,
): Promise<AdminSettingsResponse> {
  return adminFetch<AdminSettingsResponse>(`/admin/hours/overrides/${encodeURIComponent(date)}`, {
    token,
    method: 'DELETE',
  });
}
