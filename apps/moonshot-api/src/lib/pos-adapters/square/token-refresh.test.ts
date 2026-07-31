import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PosConnectionSecrets } from '../../pos-connections-repository.js';

const { obtainToken, markNeedsReauth, updateTokensAfterRefresh, listConnectionsNeedingRefresh } =
  vi.hoisted(() => ({
    obtainToken: vi.fn(),
    markNeedsReauth: vi.fn(),
    updateTokensAfterRefresh: vi.fn(),
    listConnectionsNeedingRefresh: vi.fn(),
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
  };
});

import {
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
    ...overrides,
  };
}

beforeEach(() => {
  obtainToken.mockReset();
  markNeedsReauth.mockReset();
  updateTokensAfterRefresh.mockReset();
  listConnectionsNeedingRefresh.mockReset();
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
