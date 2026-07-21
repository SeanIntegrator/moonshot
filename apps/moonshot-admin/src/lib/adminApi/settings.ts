import type {
  AdminSettingsPatchBody,
  AdminSettingsResponse,
  Cafe,
  FeatureFlagKey,
} from '@moonshot/types';
import { apiUrl, parseEnvelope } from './http.js';

export type PublicCafePayload = {
  cafe: Cafe;
  activeFeatures: FeatureFlagKey[];
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
  const res = await fetch(apiUrl('/admin/settings'), {
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
