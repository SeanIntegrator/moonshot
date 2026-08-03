import { POS_PROVIDERS } from '@moonshot/types';
import type { Pool } from 'pg';
import { pool } from '../../../db.js';
import {
  getPosConnection,
  listConnectionsNeedingCatalogSync,
  markCatalogSyncError,
  markCatalogSyncSuccess,
  markCatalogSyncing,
} from '../../pos-connections-repository.js';
import { ensureFreshSquareAccessToken } from './token-refresh.js';
import {
  fetchSquareCatalog,
  searchSquareCatalogSince,
} from './catalog-fetch.js';
import { normaliseSquareCatalog } from './catalog-normalise.js';
import { syncNormalisedMenuCatalog } from '../../menu-sync-catalog.js';
import { loadExistingPosCategoryKeys } from '../../pos-catalog/menu-catalog-upsert.js';
import { resolveSquareEnvironment } from '../../square/oauth-urls.js';
import { notifyMenuCatalogSynced } from '../../menu-sync-notify.js';

const DEBOUNCE_MS = 45_000;

type PendingEntry = {
  timer: ReturnType<typeof setTimeout>;
  forceFull: boolean;
  source: CatalogSyncSource;
};

export type CatalogSyncSource = 'webhook' | 'manual' | 'cron';

const pendingByCafe = new Map<string, PendingEntry>();
const inFlight = new Set<string>();

/** Clears debounce timers / in-flight flags — test only. */
export function resetCatalogSyncStateForTests(): void {
  for (const entry of pendingByCafe.values()) {
    clearTimeout(entry.timer);
  }
  pendingByCafe.clear();
  inFlight.clear();
}

export type CatalogSyncRunResult = {
  cafeId: string;
  upsertedItems: number;
  softDeletedItems: number;
  upsertedGroups: number;
  lastSyncedAt: string;
};

/**
 * Debounce catalog sync per café (Square catalog.version.updated can burst).
 * Runs after quiet period unless `immediate` is set (Admin Sync now).
 */
export function enqueueCatalogSync(
  cafeId: string,
  opts?: { immediate?: boolean; forceFull?: boolean; source?: CatalogSyncSource },
): void {
  const forceFull = opts?.forceFull === true;
  const source = opts?.source ?? 'webhook';
  const existing = pendingByCafe.get(cafeId);
  if (existing) {
    clearTimeout(existing.timer);
    existing.forceFull = existing.forceFull || forceFull;
  }

  if (opts?.immediate) {
    pendingByCafe.delete(cafeId);
    void runCatalogSyncForCafe(cafeId, {
      forceFull: forceFull || existing?.forceFull,
      source: source === 'webhook' ? 'manual' : source,
    });
    return;
  }

  const entry: PendingEntry = {
    forceFull: forceFull || Boolean(existing?.forceFull),
    source,
    timer: setTimeout(() => {
      pendingByCafe.delete(cafeId);
      void runCatalogSyncForCafe(cafeId, { forceFull: entry.forceFull, source: entry.source });
    }, DEBOUNCE_MS),
  };
  pendingByCafe.set(cafeId, entry);
}

export async function runCatalogSyncForCafe(
  cafeId: string,
  opts?: { forceFull?: boolean; db?: Pool; source?: CatalogSyncSource },
): Promise<CatalogSyncRunResult> {
  const db = opts?.db ?? pool;
  const source = opts?.source ?? 'manual';
  if (inFlight.has(cafeId)) {
    // Coalesce: schedule another pass after the current one finishes.
    enqueueCatalogSync(cafeId, { forceFull: opts?.forceFull, source });
    const conn = await getPosConnection(db, cafeId, POS_PROVIDERS.square);
    return {
      cafeId,
      upsertedItems: 0,
      softDeletedItems: 0,
      upsertedGroups: 0,
      lastSyncedAt: conn?.catalogLastSyncedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  inFlight.add(cafeId);
  try {
    await markCatalogSyncing(db, cafeId, POS_PROVIDERS.square);

    const conn = await ensureFreshSquareAccessToken(db, cafeId);
    if (!conn || conn.status !== 'active') {
      throw new Error('No active Square connection');
    }

    const environment = resolveSquareEnvironment();
    const forceFull = opts?.forceFull === true || !conn.catalogSyncCursor;

    const snapshot = forceFull
      ? await fetchSquareCatalog({
          accessToken: conn.accessToken,
          environment,
        })
      : await searchSquareCatalogSince({
          accessToken: conn.accessToken,
          beginTime: conn.catalogSyncCursor!.toISOString(),
          environment,
        });

    const client = await db.connect();
    let result;
    let lastSyncedAt: string;
    try {
      await client.query('BEGIN');
      const existingKeys = await loadExistingPosCategoryKeys(client, cafeId);
      const catalog = normaliseSquareCatalog(cafeId, snapshot, {
        includeDeletedItems: !forceFull,
        existingKeyByPosCategoryId: existingKeys,
      });
      result = await syncNormalisedMenuCatalog(client, cafeId, catalog);
      await client.query('COMMIT');
      const cursor = new Date(snapshot.latestTime);
      await markCatalogSyncSuccess(db, cafeId, cursor, POS_PROVIDERS.square);
      lastSyncedAt = new Date().toISOString();
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    notifyMenuCatalogSynced({
      cafeId,
      syncedAt: lastSyncedAt,
      upsertedItems: result.upsertedItems,
      softDeletedItems: result.softDeletedItems,
      source,
    });

    return {
      cafeId,
      upsertedItems: result.upsertedItems,
      softDeletedItems: result.softDeletedItems,
      upsertedGroups: result.upsertedGroups,
      lastSyncedAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markCatalogSyncError(db, cafeId, message, POS_PROVIDERS.square);
    console.error('[pos] catalog_sync_failed', { cafeId, message });
    throw err;
  } finally {
    inFlight.delete(cafeId);
  }
}

/** Daily safety-net: incremental sync for cafés stale longer than 1 day. */
export async function syncStaleCatalogs(db: Pool = pool): Promise<{
  synced: number;
  failed: number;
}> {
  const due = await listConnectionsNeedingCatalogSync(db, POS_PROVIDERS.square, '1 day');
  let synced = 0;
  let failed = 0;
  for (const conn of due) {
    try {
      await runCatalogSyncForCafe(conn.cafeId, { db, source: 'cron' });
      synced += 1;
    } catch {
      failed += 1;
    }
  }
  return { synced, failed };
}
