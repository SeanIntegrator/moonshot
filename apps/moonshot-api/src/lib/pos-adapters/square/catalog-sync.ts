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
import { resolveSquareEnvironment } from '../../square/oauth-urls.js';

const DEBOUNCE_MS = 45_000;

type PendingEntry = {
  timer: ReturnType<typeof setTimeout>;
  forceFull: boolean;
};

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
  opts?: { immediate?: boolean; forceFull?: boolean },
): void {
  const forceFull = opts?.forceFull === true;
  const existing = pendingByCafe.get(cafeId);
  if (existing) {
    clearTimeout(existing.timer);
    existing.forceFull = existing.forceFull || forceFull;
  }

  // #region agent log
  fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H4',location:'catalog-sync.ts:enqueue',message:'catalog sync enqueued',data:{cafeId,immediate:Boolean(opts?.immediate),forceFull,hadPending:Boolean(existing),debounceMs:DEBOUNCE_MS},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (opts?.immediate) {
    pendingByCafe.delete(cafeId);
    void runCatalogSyncForCafe(cafeId, { forceFull: forceFull || existing?.forceFull });
    return;
  }

  const entry: PendingEntry = {
    forceFull: forceFull || Boolean(existing?.forceFull),
    timer: setTimeout(() => {
      pendingByCafe.delete(cafeId);
      // #region agent log
      fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H4',location:'catalog-sync.ts:debounce-fire',message:'debounce timer fired → run sync',data:{cafeId,forceFull:entry.forceFull},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      void runCatalogSyncForCafe(cafeId, { forceFull: entry.forceFull });
    }, DEBOUNCE_MS),
  };
  pendingByCafe.set(cafeId, entry);
}

export async function runCatalogSyncForCafe(
  cafeId: string,
  opts?: { forceFull?: boolean; db?: Pool },
): Promise<CatalogSyncRunResult> {
  const db = opts?.db ?? pool;
  if (inFlight.has(cafeId)) {
    // Coalesce: schedule another pass after the current one finishes.
    enqueueCatalogSync(cafeId, { forceFull: opts?.forceFull });
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

    // #region agent log
    fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H4',location:'catalog-sync.ts:run-start',message:'catalog sync run starting',data:{cafeId,forceFull,hasCursor:Boolean(conn.catalogSyncCursor),cursorIso:conn.catalogSyncCursor?.toISOString()??null,status:conn.status},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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

    const normalised = normaliseSquareCatalog(cafeId, snapshot, {
      includeDeletedItems: !forceFull,
    });

    const client = await db.connect();
    let result;
    try {
      await client.query('BEGIN');
      result = await syncNormalisedMenuCatalog(client, cafeId, normalised.menu, {
        groupsByPosId: normalised.groupsByPosId,
        roleHints: normalised.roleHints,
        deletedPosItemIds: normalised.deletedPosItemIds,
      });
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const cursor = new Date(snapshot.latestTime);
    await markCatalogSyncSuccess(db, cafeId, cursor, POS_PROVIDERS.square);

    // #region agent log
    fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H5',location:'catalog-sync.ts:run-success',message:'catalog sync succeeded',data:{cafeId,forceFull,upsertedItems:result.upsertedItems,softDeletedItems:result.softDeletedItems,itemCount:normalised.menu.items.length,latestTime:snapshot.latestTime},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    return {
      cafeId,
      upsertedItems: result.upsertedItems,
      softDeletedItems: result.softDeletedItems,
      upsertedGroups: result.upsertedGroups,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markCatalogSyncError(db, cafeId, message, POS_PROVIDERS.square);
    console.error('[pos] catalog_sync_failed', { cafeId, message });
    // #region agent log
    fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H4',location:'catalog-sync.ts:run-failed',message:'catalog sync failed',data:{cafeId,error:message},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
      await runCatalogSyncForCafe(conn.cafeId, { db });
      synced += 1;
    } catch {
      failed += 1;
    }
  }
  return { synced, failed };
}
