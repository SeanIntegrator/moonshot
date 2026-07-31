import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PosConnectionSecrets } from '../../pos-connections-repository.js';

const {
  ensureFreshSquareAccessToken,
  fetchSquareCatalog,
  searchSquareCatalogSince,
  syncNormalisedMenuCatalog,
  markCatalogSyncing,
  markCatalogSyncSuccess,
  markCatalogSyncError,
  getPosConnection,
  poolConnect,
} = vi.hoisted(() => ({
  ensureFreshSquareAccessToken: vi.fn(),
  fetchSquareCatalog: vi.fn(),
  searchSquareCatalogSince: vi.fn(),
  syncNormalisedMenuCatalog: vi.fn(),
  markCatalogSyncing: vi.fn(),
  markCatalogSyncSuccess: vi.fn(),
  markCatalogSyncError: vi.fn(),
  getPosConnection: vi.fn(),
  poolConnect: vi.fn(),
}));

vi.mock('./token-refresh.js', () => ({
  ensureFreshSquareAccessToken,
}));

vi.mock('./catalog-fetch.js', () => ({
  fetchSquareCatalog,
  searchSquareCatalogSince,
}));

vi.mock('../../menu-sync-catalog.js', () => ({
  syncNormalisedMenuCatalog,
}));

vi.mock('../../pos-connections-repository.js', async () => {
  const actual = await vi.importActual<typeof import('../../pos-connections-repository.js')>(
    '../../pos-connections-repository.js',
  );
  return {
    ...actual,
    markCatalogSyncing,
    markCatalogSyncSuccess,
    markCatalogSyncError,
    getPosConnection,
  };
});

vi.mock('../../square/oauth-urls.js', () => ({
  resolveSquareEnvironment: () => 'sandbox',
}));

vi.mock('../../../db.js', () => ({
  pool: { connect: poolConnect },
}));

import {
  enqueueCatalogSync,
  resetCatalogSyncStateForTests,
  runCatalogSyncForCafe,
} from './catalog-sync.js';

function conn(overrides: Partial<PosConnectionSecrets> = {}): PosConnectionSecrets {
  return {
    id: 'row-1',
    cafeId: 'cafe-1',
    provider: 'square',
    merchantId: 'MERCH',
    locationId: 'LOC',
    accessToken: 'access',
    refreshToken: 'refresh',
    accessTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    scopes: [],
    status: 'active',
    lastRefreshedAt: new Date(),
    connectedAt: new Date(),
    catalogSyncCursor: new Date('2026-01-01T00:00:00.000Z'),
    catalogLastSyncedAt: new Date('2026-01-01T00:00:00.000Z'),
    catalogSyncStatus: 'idle',
    catalogSyncError: null,
    ...overrides,
  };
}

function stubClient() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };
}

beforeEach(() => {
  resetCatalogSyncStateForTests();
  ensureFreshSquareAccessToken.mockReset();
  fetchSquareCatalog.mockReset();
  searchSquareCatalogSince.mockReset();
  syncNormalisedMenuCatalog.mockReset();
  markCatalogSyncing.mockReset();
  markCatalogSyncSuccess.mockReset();
  markCatalogSyncError.mockReset();
  getPosConnection.mockReset();
  poolConnect.mockReset();
  poolConnect.mockResolvedValue(stubClient());
  syncNormalisedMenuCatalog.mockResolvedValue({
    upsertedItems: 1,
    softDeletedItems: 0,
    upsertedGroups: 1,
  });
});

afterEach(() => {
  resetCatalogSyncStateForTests();
  vi.useRealTimers();
});

describe('runCatalogSyncForCafe', () => {
  it('uses Search when a catalog cursor exists and advances to latestTime', async () => {
    const client = stubClient();
    const db = { connect: vi.fn().mockResolvedValue(client) };
    const cursor = new Date('2026-06-01T12:00:00.000Z');
    ensureFreshSquareAccessToken.mockResolvedValueOnce(
      conn({ catalogSyncCursor: cursor }),
    );
    searchSquareCatalogSince.mockResolvedValueOnce({
      items: [],
      categories: [],
      modifierLists: [],
      images: [],
      latestTime: '2026-06-02T15:00:00.000Z',
    });

    await runCatalogSyncForCafe('cafe-1', { db: db as never });

    expect(searchSquareCatalogSince).toHaveBeenCalledWith(
      expect.objectContaining({ beginTime: cursor.toISOString() }),
    );
    expect(fetchSquareCatalog).not.toHaveBeenCalled();
    expect(markCatalogSyncSuccess).toHaveBeenCalledWith(
      expect.anything(),
      'cafe-1',
      new Date('2026-06-02T15:00:00.000Z'),
      'square',
    );
  });

  it('uses full List when forceFull or no cursor', async () => {
    const client = stubClient();
    const db = { connect: vi.fn().mockResolvedValue(client) };
    ensureFreshSquareAccessToken.mockResolvedValueOnce(
      conn({ catalogSyncCursor: null }),
    );
    fetchSquareCatalog.mockResolvedValueOnce({
      items: [],
      categories: [],
      modifierLists: [],
      images: [],
      latestTime: '2026-07-01T00:00:00.000Z',
    });

    await runCatalogSyncForCafe('cafe-1', { forceFull: true, db: db as never });

    expect(fetchSquareCatalog).toHaveBeenCalled();
    expect(searchSquareCatalogSince).not.toHaveBeenCalled();
  });
});

describe('enqueueCatalogSync', () => {
  it('runs immediately when requested', async () => {
    ensureFreshSquareAccessToken.mockResolvedValue(conn({ catalogSyncCursor: null }));
    fetchSquareCatalog.mockResolvedValue({
      items: [],
      categories: [],
      modifierLists: [],
      images: [],
      latestTime: '2026-07-01T00:00:00.000Z',
    });

    enqueueCatalogSync('cafe-immediate', { immediate: true, forceFull: true });
    await vi.waitFor(() => {
      expect(markCatalogSyncing).toHaveBeenCalled();
    });
  });

  it('schedules after debounce quiet period', async () => {
    vi.useFakeTimers();
    ensureFreshSquareAccessToken.mockResolvedValue(conn({ catalogSyncCursor: null }));
    fetchSquareCatalog.mockResolvedValue({
      items: [],
      categories: [],
      modifierLists: [],
      images: [],
      latestTime: '2026-07-01T00:00:00.000Z',
    });

    enqueueCatalogSync('cafe-timer');
    expect(markCatalogSyncing).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(45_000);
    await vi.waitFor(() => {
      expect(markCatalogSyncing).toHaveBeenCalled();
    });
  });
});
