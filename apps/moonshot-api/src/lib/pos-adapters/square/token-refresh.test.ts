import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PosConnectionSecrets } from '../../pos-connections-repository.js';

const {
  obtainToken,
  markNeedsReauth,
  updateTokensAfterRefresh,
  listConnectionsNeedingRefresh,
  getPosConnection,
} = vi.hoisted(() => ({
  obtainToken: vi.fn(),
  markNeedsReauth: vi.fn(),
  updateTokensAfterRefresh: vi.fn(),
  listConnectionsNeedingRefresh: vi.fn(),
  getPosConnection: vi.fn(),
}));

vi.mock('./client.js', () => ({
  createSquareAppClient: () => ({
    oAuth: { obtainToken },
  }),
}));

vi.mock('../../square/oauth-urls.js', () => ({
  resolveSquareApplicationId: () => 'app-id',
  resolveSquareApplicationSecret: () => 'app-secret',
}));

vi.mock('../../pos-connections-repository.js', async () => {
  const actual = await vi.importActual<typeof import('../../pos-connections-repository.js')>(
    '../../pos-connections-repository.js',
  );
  return {
    ...actual,
    markNeedsReauth,
    updateTokensAfterRefresh,
    listConnectionsNeedingRefresh,
    getPosConnection,
  };
});

import {
  ensureFreshSquareAccessToken,
  refreshDueSquareTokens,
  refreshSquareConnection,
} from './token-refresh.js';

function conn(overrides: Partial<PosConnectionSecrets> = {}): PosConnectionSecrets {
  return {
    id: 'row-1',
    cafeId: 'cafe-1',
    provider: 'square',
    merchantId: 'MERCH',
    locationId: 'LOC',
    accessToken: 'old-access',
    refreshToken: 'refresh-token',
    accessTokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    scopes: [],
    status: 'active',
    lastRefreshedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    connectedAt: new Date(),
    catalogSyncCursor: null,
    catalogLastSyncedAt: null,
    catalogSyncStatus: 'idle',
    catalogSyncError: null,
    ...overrides,
  };
}

beforeEach(() => {
  obtainToken.mockReset();
  markNeedsReauth.mockReset();
  updateTokensAfterRefresh.mockReset();
  listConnectionsNeedingRefresh.mockReset();
  getPosConnection.mockReset();
});

describe('refreshSquareConnection', () => {
  it('persists new tokens on success', async () => {
    obtainToken.mockResolvedValueOnce({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    updateTokensAfterRefresh.mockResolvedValueOnce(conn({ accessToken: 'new-access' }));

    const result = await refreshSquareConnection({} as never, conn());
    expect(result).toEqual({ kind: 'refreshed', cafeId: 'cafe-1' });
    expect(updateTokensAfterRefresh).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cafeId: 'cafe-1',
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      }),
    );
  });

  it('marks needs_reauth on permanent auth failure', async () => {
    const err = Object.assign(new Error('invalid_grant'), { statusCode: 401 });
    obtainToken.mockRejectedValueOnce(err);
    markNeedsReauth.mockResolvedValueOnce(undefined);

    const result = await refreshSquareConnection({} as never, conn());
    expect(result).toEqual({ kind: 'needs_reauth', cafeId: 'cafe-1' });
    expect(markNeedsReauth).toHaveBeenCalled();
  });
});

describe('refreshDueSquareTokens', () => {
  it('skips when no rows are due', async () => {
    listConnectionsNeedingRefresh.mockResolvedValueOnce([]);
    const result = await refreshDueSquareTokens({} as never);
    expect(result).toEqual({
      refreshed: 0,
      needsReauth: 0,
      failed: 0,
      skipped: 0,
      details: [],
    });
    expect(obtainToken).not.toHaveBeenCalled();
  });

  it('refreshes due rows', async () => {
    listConnectionsNeedingRefresh.mockResolvedValueOnce([conn()]);
    obtainToken.mockResolvedValueOnce({
      accessToken: 'new-access',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    updateTokensAfterRefresh.mockResolvedValueOnce(conn());

    const result = await refreshDueSquareTokens({} as never);
    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(0);
  });
});

describe('ensureFreshSquareAccessToken', () => {
  it('returns the current connection when refresh is not due', async () => {
    const current = conn({
      lastRefreshedAt: new Date(),
      accessTokenExpiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    });
    getPosConnection.mockResolvedValueOnce(current);

    const result = await ensureFreshSquareAccessToken({} as never, 'cafe-1');
    expect(result).toEqual(current);
    expect(obtainToken).not.toHaveBeenCalled();
  });

  it('keeps the unexpired access token when ObtainToken fails transiently', async () => {
    const current = conn();
    getPosConnection.mockResolvedValueOnce(current);
    obtainToken.mockRejectedValueOnce(new Error('square 503'));

    const result = await ensureFreshSquareAccessToken({} as never, 'cafe-1');
    expect(result).toEqual(current);
    expect(result?.accessToken).toBe('old-access');
  });

  it('returns null when refresh fails and the access token is already expired', async () => {
    const expired = conn({
      accessTokenExpiresAt: new Date(Date.now() - 60_000),
    });
    getPosConnection.mockResolvedValueOnce(expired);
    obtainToken.mockRejectedValueOnce(new Error('square 503'));

    const result = await ensureFreshSquareAccessToken({} as never, 'cafe-1');
    expect(result).toBeNull();
  });

  it('returns the reloaded connection after a successful refresh', async () => {
    const current = conn();
    const refreshed = conn({ accessToken: 'new-access' });
    getPosConnection.mockResolvedValueOnce(current).mockResolvedValueOnce(refreshed);
    obtainToken.mockResolvedValueOnce({
      accessToken: 'new-access',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    updateTokensAfterRefresh.mockResolvedValueOnce(refreshed);

    const result = await ensureFreshSquareAccessToken({} as never, 'cafe-1');
    expect(result).toEqual(refreshed);
  });
});
