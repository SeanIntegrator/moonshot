import type { Pool, PoolClient } from 'pg';
import { POS_PROVIDERS, type PosProvider } from '@moonshot/types';
import { decryptSecret, encryptSecret } from './crypto/secret-box.js';

type Db = Pool | PoolClient;

export type PosConnectionStatus = 'active' | 'needs_reauth' | 'revoked';

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

function mapRow(row: PosConnectionRow): PosConnectionSecrets {
  return {
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
  };
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
} | null> {
  const { rows } = await db.query<{
    merchant_id: string;
    location_id: string | null;
    access_token_expires_at: Date;
    status: PosConnectionStatus;
  }>(
    `SELECT merchant_id, location_id, access_token_expires_at, status
     FROM pos_connections
     WHERE cafe_id = $1 AND provider = $2 AND status <> 'revoked'
     LIMIT 1`,
    [cafeId, provider],
  );
  if (!rows[0]) {
    return { connected: false, merchantId: null, locationId: null, tokenExpiresAt: null, status: null };
  }
  return {
    connected: rows[0].status === 'active',
    merchantId: rows[0].merchant_id,
    locationId: rows[0].location_id,
    tokenExpiresAt: rows[0].access_token_expires_at.toISOString(),
    status: rows[0].status,
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
