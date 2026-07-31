import type { Pool, PoolClient } from 'pg';
import { POS_PROVIDERS, type PosProvider } from '@moonshot/types';
import { decryptSecret, encryptSecret } from './crypto/secret-box.js';

type Db = Pool | PoolClient;

export type PosConnectionStatus = 'active' | 'needs_reauth' | 'revoked';

export type CatalogSyncStatus = 'idle' | 'syncing' | 'error';

export type PosConnectionRow = {
  id: string;
  cafe_id: string;
  provider: string;
  merchant_id: string;
  location_id: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  access_token_expires_at: Date;
  scopes: string[];
  status: PosConnectionStatus;
  last_refreshed_at: Date;
  connected_at: Date;
  updated_at: Date;
  catalog_sync_cursor: Date | null;
  catalog_last_synced_at: Date | null;
  catalog_sync_status: CatalogSyncStatus;
  catalog_sync_error: string | null;
};

/** Decrypted tokens — never log these. */
export type PosConnectionSecrets = {
  id: string;
  cafeId: string;
  provider: PosProvider;
  merchantId: string;
  locationId: string | null;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  scopes: string[];
  status: PosConnectionStatus;
  lastRefreshedAt: Date;
  connectedAt: Date;
  catalogSyncCursor: Date | null;
  catalogLastSyncedAt: Date | null;
  catalogSyncStatus: CatalogSyncStatus;
  catalogSyncError: string | null;
};

export type UpsertPosConnectionInput = {
  cafeId: string;
  provider: PosProvider;
  merchantId: string;
  locationId?: string | null;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  scopes: string[];
};

/** Alert when last refresh is older than this, or the access token is already expired. */
export const POS_TOKEN_STALE_ALERT_MS = 8 * 24 * 60 * 60 * 1000;

/** Refresh when expiry or last refresh falls inside this window. */
export const POS_TOKEN_REFRESH_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;

/** Structured log when a loaded token looks abandoned — never includes token values. */
export function alertIfPosTokenStale(conn: PosConnectionSecrets): void {
  const now = Date.now();
  const lastRefreshAge = now - conn.lastRefreshedAt.getTime();
  const expired = conn.accessTokenExpiresAt.getTime() <= now;
  if (!expired && lastRefreshAge < POS_TOKEN_STALE_ALERT_MS) return;
  console.error('[pos] stale_token_alert', {
    cafeId: conn.cafeId,
    provider: conn.provider,
    merchantId: conn.merchantId,
    status: conn.status,
    accessTokenExpiresAt: conn.accessTokenExpiresAt.toISOString(),
    lastRefreshedAt: conn.lastRefreshedAt.toISOString(),
    expired,
  });
}

function mapRow(row: PosConnectionRow): PosConnectionSecrets {
  const mapped: PosConnectionSecrets = {
    id: row.id,
    cafeId: row.cafe_id,
    provider: row.provider as PosProvider,
    merchantId: row.merchant_id,
    locationId: row.location_id,
    accessToken: decryptSecret(row.access_token_encrypted),
    refreshToken: decryptSecret(row.refresh_token_encrypted),
    accessTokenExpiresAt: row.access_token_expires_at,
    scopes: row.scopes ?? [],
    status: row.status,
    lastRefreshedAt: row.last_refreshed_at,
    connectedAt: row.connected_at,
    catalogSyncCursor: row.catalog_sync_cursor ?? null,
    catalogLastSyncedAt: row.catalog_last_synced_at ?? null,
    catalogSyncStatus: row.catalog_sync_status ?? 'idle',
    catalogSyncError: row.catalog_sync_error ?? null,
  };
  if (mapped.status === 'active') {
    alertIfPosTokenStale(mapped);
  }
  return mapped;
}

/**
 * Insert or replace the café's connection for a provider.
 * This is the only module that encrypts / decrypts POS tokens.
 */
export async function upsertPosConnection(
  db: Db,
  input: UpsertPosConnectionInput,
): Promise<PosConnectionSecrets> {
  const accessEnc = encryptSecret(input.accessToken);
  const refreshEnc = encryptSecret(input.refreshToken);

  const { rows } = await db.query<PosConnectionRow>(
    `INSERT INTO pos_connections (
       cafe_id, provider, merchant_id, location_id,
       access_token_encrypted, refresh_token_encrypted, access_token_expires_at,
       scopes, status, last_refreshed_at, connected_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], 'active', NOW(), NOW(), NOW())
     ON CONFLICT (cafe_id, provider) DO UPDATE SET
       merchant_id = EXCLUDED.merchant_id,
       location_id = COALESCE(EXCLUDED.location_id, pos_connections.location_id),
       access_token_encrypted = EXCLUDED.access_token_encrypted,
       refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
       access_token_expires_at = EXCLUDED.access_token_expires_at,
       scopes = EXCLUDED.scopes,
       status = 'active',
       last_refreshed_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [
      input.cafeId,
      input.provider,
      input.merchantId,
      input.locationId ?? null,
      accessEnc,
      refreshEnc,
      input.accessTokenExpiresAt,
      input.scopes,
    ],
  );
  return mapRow(rows[0]!);
}

export async function getPosConnection(
  db: Db,
  cafeId: string,
  provider: PosProvider = POS_PROVIDERS.square,
): Promise<PosConnectionSecrets | null> {
  const { rows } = await db.query<PosConnectionRow>(
    `SELECT * FROM pos_connections
     WHERE cafe_id = $1 AND provider = $2 AND status <> 'revoked'
     LIMIT 1`,
    [cafeId, provider],
  );
  if (!rows[0]) return null;
  return mapRow(rows[0]);
}

export async function getPosConnectionPublicStatus(
  db: Db,
  cafeId: string,
  provider: PosProvider = POS_PROVIDERS.square,
): Promise<{
  connected: boolean;
  merchantId: string | null;
  locationId: string | null;
  tokenExpiresAt: string | null;
  status: PosConnectionStatus | null;
  catalogLastSyncedAt: string | null;
  catalogSyncStatus: CatalogSyncStatus | null;
  catalogSyncError: string | null;
} | null> {
  const { rows } = await db.query<{
    merchant_id: string;
    location_id: string | null;
    access_token_expires_at: Date;
    status: PosConnectionStatus;
    catalog_last_synced_at: Date | null;
    catalog_sync_status: CatalogSyncStatus;
    catalog_sync_error: string | null;
  }>(
    `SELECT merchant_id, location_id, access_token_expires_at, status,
            catalog_last_synced_at, catalog_sync_status, catalog_sync_error
     FROM pos_connections
     WHERE cafe_id = $1 AND provider = $2 AND status <> 'revoked'
     LIMIT 1`,
    [cafeId, provider],
  );
  if (!rows[0]) {
    return {
      connected: false,
      merchantId: null,
      locationId: null,
      tokenExpiresAt: null,
      status: null,
      catalogLastSyncedAt: null,
      catalogSyncStatus: null,
      catalogSyncError: null,
    };
  }
  return {
    connected: rows[0].status === 'active',
    merchantId: rows[0].merchant_id,
    locationId: rows[0].location_id,
    tokenExpiresAt: rows[0].access_token_expires_at.toISOString(),
    status: rows[0].status,
    catalogLastSyncedAt: rows[0].catalog_last_synced_at?.toISOString() ?? null,
    catalogSyncStatus: rows[0].catalog_sync_status ?? 'idle',
    catalogSyncError: rows[0].catalog_sync_error ?? null,
  };
}

export async function updatePosConnectionLocation(
  db: Db,
  cafeId: string,
  provider: PosProvider,
  locationId: string,
): Promise<void> {
  await db.query(
    `UPDATE pos_connections SET location_id = $1, updated_at = NOW()
     WHERE cafe_id = $2 AND provider = $3`,
    [locationId, cafeId, provider],
  );
}

export async function markNeedsReauth(
  db: Db,
  cafeId: string,
  provider: PosProvider,
): Promise<void> {
  await db.query(
    `UPDATE pos_connections SET status = 'needs_reauth', updated_at = NOW()
     WHERE cafe_id = $1 AND provider = $2`,
    [cafeId, provider],
  );
}

export async function deletePosConnection(
  db: Db,
  cafeId: string,
  provider: PosProvider,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM pos_connections WHERE cafe_id = $1 AND provider = $2`,
    [cafeId, provider],
  );
  return (rowCount ?? 0) > 0;
}

export async function findCafeIdByMerchantId(
  db: Db,
  provider: PosProvider,
  merchantId: string,
): Promise<string | null> {
  const { rows } = await db.query<{ cafe_id: string }>(
    `SELECT cafe_id FROM pos_connections
     WHERE provider = $1 AND merchant_id = $2 AND status = 'active'
     LIMIT 1`,
    [provider, merchantId],
  );
  return rows[0]?.cafe_id ?? null;
}

/**
 * Active Square connections whose access token expires within 7 days,
 * or whose last refresh is older than 7 days (belt-and-braces).
 */
export async function listConnectionsNeedingRefresh(
  db: Db,
  provider: PosProvider = POS_PROVIDERS.square,
): Promise<PosConnectionSecrets[]> {
  const { rows } = await db.query<PosConnectionRow>(
    `SELECT * FROM pos_connections
     WHERE provider = $1
       AND status = 'active'
       AND (
         access_token_expires_at < NOW() + ($2::text)::interval
         OR last_refreshed_at < NOW() - ($2::text)::interval
       )
     ORDER BY access_token_expires_at ASC`,
    [provider, '7 days'],
  );
  return rows.map(mapRow);
}

export type UpdateTokensAfterRefreshInput = {
  cafeId: string;
  provider: PosProvider;
  accessToken: string;
  /** Square may rotate the refresh token; keep previous when omitted. */
  refreshToken?: string;
  accessTokenExpiresAt: Date;
};

export async function updateTokensAfterRefresh(
  db: Db,
  input: UpdateTokensAfterRefreshInput,
): Promise<PosConnectionSecrets> {
  const accessEnc = encryptSecret(input.accessToken);
  const refreshEnc =
    input.refreshToken !== undefined ? encryptSecret(input.refreshToken) : null;

  const { rows } = await db.query<PosConnectionRow>(
    `UPDATE pos_connections SET
       access_token_encrypted = $1,
       refresh_token_encrypted = COALESCE($2, refresh_token_encrypted),
       access_token_expires_at = $3,
       last_refreshed_at = NOW(),
       status = 'active',
       updated_at = NOW()
     WHERE cafe_id = $4 AND provider = $5
     RETURNING *`,
    [
      accessEnc,
      refreshEnc,
      input.accessTokenExpiresAt,
      input.cafeId,
      input.provider,
    ],
  );
  if (!rows[0]) {
    throw new Error(`pos_connections row missing for cafe ${input.cafeId} / ${input.provider}`);
  }
  return mapRow(rows[0]);
}

export async function markCatalogSyncing(
  db: Db,
  cafeId: string,
  provider: PosProvider = POS_PROVIDERS.square,
): Promise<void> {
  await db.query(
    `UPDATE pos_connections
     SET catalog_sync_status = 'syncing', catalog_sync_error = NULL, updated_at = NOW()
     WHERE cafe_id = $1 AND provider = $2`,
    [cafeId, provider],
  );
}

export async function markCatalogSyncSuccess(
  db: Db,
  cafeId: string,
  cursor: Date,
  provider: PosProvider = POS_PROVIDERS.square,
): Promise<void> {
  await db.query(
    `UPDATE pos_connections SET
       catalog_sync_cursor = $1,
       catalog_last_synced_at = NOW(),
       catalog_sync_status = 'idle',
       catalog_sync_error = NULL,
       updated_at = NOW()
     WHERE cafe_id = $2 AND provider = $3`,
    [cursor, cafeId, provider],
  );
}

export async function markCatalogSyncError(
  db: Db,
  cafeId: string,
  message: string,
  provider: PosProvider = POS_PROVIDERS.square,
): Promise<void> {
  await db.query(
    `UPDATE pos_connections SET
       catalog_sync_status = 'error',
       catalog_sync_error = $1,
       updated_at = NOW()
     WHERE cafe_id = $2 AND provider = $3`,
    [message.slice(0, 2000), cafeId, provider],
  );
}

/** Active Square connections whose catalog has not synced in the given interval (safety net). */
export async function listConnectionsNeedingCatalogSync(
  db: Db,
  provider: PosProvider = POS_PROVIDERS.square,
  olderThanInterval = '1 day',
): Promise<PosConnectionSecrets[]> {
  const { rows } = await db.query<PosConnectionRow>(
    `SELECT * FROM pos_connections
     WHERE provider = $1
       AND status = 'active'
       AND (
         catalog_last_synced_at IS NULL
         OR catalog_last_synced_at < NOW() - ($2::text)::interval
       )
     ORDER BY catalog_last_synced_at ASC NULLS FIRST`,
    [provider, olderThanInterval],
  );
  return rows.map(mapRow);
}
