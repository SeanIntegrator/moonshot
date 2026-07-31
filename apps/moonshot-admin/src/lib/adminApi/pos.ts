import type { MenuProvisionResult } from '@moonshot/types';
import { apiUrl, parseEnvelope } from './http.js';

export type SquareConnectLocation = { id: string; name: string };

export type SquareConnectStatus = {
  connected: boolean;
  merchantId: string | null;
  locationId: string | null;
  tokenExpiresAt: string | null;
  status: string | null;
  locations: SquareConnectLocation[];
};

export type SquareOnboardResponse = {
  url: string;
  scopes: string[];
};

export async function startSquareConnect(token: string): Promise<SquareOnboardResponse> {
  const res = await fetch(apiUrl('/admin/connect/square/onboard'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await parseEnvelope<SquareOnboardResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Square connect failed (${res.status})`);
  }
  return envelope.data;
}

export async function getSquareConnectStatus(token: string): Promise<SquareConnectStatus> {
  const res = await fetch(apiUrl('/admin/connect/square/status'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await parseEnvelope<SquareConnectStatus>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Square status failed (${res.status})`);
  }
  return envelope.data;
}

export async function importPosMenu(
  token: string,
  body: { provider: 'square'; locationId?: string | null },
): Promise<MenuProvisionResult> {
  const res = await fetch(apiUrl('/admin/onboarding/menu-pos-import'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<MenuProvisionResult>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Menu import failed (${res.status})`);
  }
  return envelope.data;
}
