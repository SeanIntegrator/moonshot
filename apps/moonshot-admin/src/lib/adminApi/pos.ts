import type { MenuProvisionResult } from '@moonshot/domain';
import type {
  PosCatalogSyncResult,
  SquareConnectStatus,
  SquareOnboardResponse,
} from '@moonshot/types';
import { adminFetch } from './http.js';

export type {
  PosCatalogSyncResult,
  SquareConnectLocation,
  SquareConnectStatus,
  SquareOnboardResponse,
} from '@moonshot/types';

export async function startSquareConnect(token: string): Promise<SquareOnboardResponse> {
  return adminFetch<SquareOnboardResponse>('/admin/connect/square/onboard', {
    token,
    method: 'POST',
    errorMessage: 'Square connect failed',
  });
}

export async function getSquareConnectStatus(token: string): Promise<SquareConnectStatus> {
  return adminFetch<SquareConnectStatus>('/admin/connect/square/status', {
    token,
    errorMessage: 'Square status failed',
  });
}

export async function disconnectSquare(token: string): Promise<void> {
  await adminFetch<{ disconnected: boolean }>('/admin/connect/square/disconnect', {
    token,
    method: 'POST',
    errorMessage: 'Square disconnect failed',
  });
}

export async function syncPosMenuFromSquare(
  token: string,
  opts?: { forceFull?: boolean },
): Promise<PosCatalogSyncResult> {
  return adminFetch<PosCatalogSyncResult>('/admin/menu/sync-pos', {
    token,
    method: 'POST',
    json: { forceFull: opts?.forceFull === true },
    errorMessage: 'Menu sync failed',
  });
}

export async function importPosMenu(
  token: string,
  body: { provider: 'square'; locationId?: string | null },
): Promise<MenuProvisionResult> {
  return adminFetch<MenuProvisionResult>('/admin/onboarding/menu-pos-import', {
    token,
    method: 'POST',
    json: body,
    errorMessage: 'Menu import failed',
  });
}
