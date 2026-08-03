import type { Pool, PoolClient } from 'pg';
import { POS_PROVIDERS } from '@moonshot/domain';
import { SquareError } from 'square';
import {
  getPosConnection,
  listConnectionsNeedingRefresh,
  markNeedsReauth,
  POS_TOKEN_REFRESH_WITHIN_MS,
  type PosConnectionSecrets,
  updateTokensAfterRefresh,
} from '../../pos-connections-repository.js';
import {
  createSquareAppClient,
  type SquareClientEnvironment,
} from './client.js';
import {
  resolveSquareApplicationId,
  resolveSquareApplicationSecret,
} from '../../square/oauth-urls.js';

type Db = Pool | PoolClient;

export type RefreshOneResult =
  | { kind: 'refreshed'; cafeId: string }
  | { kind: 'needs_reauth'; cafeId: string }
  | { kind: 'failed'; cafeId: string; message: string }
  | { kind: 'skipped'; cafeId: string; reason: string };

export type RefreshDueResult = {
  refreshed: number;
  needsReauth: number;
  failed: number;
  skipped: number;
  details: RefreshOneResult[];
};

function isPermanentAuthFailure(err: unknown): boolean {
  if (!(err instanceof SquareError)) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 401 || status === 403) return true;
    return false;
  }
  if (err.statusCode === 401 || err.statusCode === 403) return true;
  const body = String(err.message ?? '').toLowerCase();
  return (
    body.includes('invalid_grant') ||
    body.includes('not_authorized') ||
    body.includes('access_token_revoked') ||
    (body.includes('refresh_token') && body.includes('invalid'))
  );
}

function expiresAtFromTokenResponse(expiresAt: string | undefined): Date {
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

/**
 * Call Square ObtainToken(grant_type=refresh_token) and persist the new tokens.
 * On permanent auth failure, marks the connection `needs_reauth` and stops retrying.
 */
export async function refreshSquareConnection(
  db: Db,
  conn: PosConnectionSecrets,
  environment?: SquareClientEnvironment,
): Promise<RefreshOneResult> {
  const cafeId = conn.cafeId;
  try {
    const appClient = createSquareAppClient(environment);
    const tokenRes = await appClient.oAuth.obtainToken({
      clientId: resolveSquareApplicationId(),
      clientSecret: resolveSquareApplicationSecret(),
      grantType: 'refresh_token',
      refreshToken: conn.refreshToken,
    });

    const accessToken = tokenRes.accessToken;
    if (!accessToken) {
      return { kind: 'failed', cafeId, message: 'obtainToken returned no accessToken' };
    }

    await updateTokensAfterRefresh(db, {
      cafeId,
      provider: POS_PROVIDERS.square,
      accessToken,
      refreshToken: tokenRes.refreshToken ?? undefined,
      accessTokenExpiresAt: expiresAtFromTokenResponse(tokenRes.expiresAt),
    });

    return { kind: 'refreshed', cafeId };
  } catch (err) {
    if (isPermanentAuthFailure(err)) {
      await markNeedsReauth(db, cafeId, POS_PROVIDERS.square);
      console.error('[pos] square_refresh_needs_reauth', {
        cafeId,
        merchantId: conn.merchantId,
        message: err instanceof Error ? err.message : String(err),
      });
      return { kind: 'needs_reauth', cafeId };
    }
    console.error('[pos] square_refresh_failed', {
      cafeId,
      merchantId: conn.merchantId,
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      kind: 'failed',
      cafeId,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Cron entry: refresh every active Square connection that is due. */
export async function refreshDueSquareTokens(
  db: Db,
  environment?: SquareClientEnvironment,
): Promise<RefreshDueResult> {
  const due = await listConnectionsNeedingRefresh(db, POS_PROVIDERS.square);
  const details: RefreshOneResult[] = [];
  let refreshed = 0;
  let needsReauth = 0;
  let failed = 0;
  let skipped = 0;

  for (const conn of due) {
    const result = await refreshSquareConnection(db, conn, environment);
    details.push(result);
    if (result.kind === 'refreshed') refreshed += 1;
    else if (result.kind === 'needs_reauth') needsReauth += 1;
    else if (result.kind === 'failed') failed += 1;
    else skipped += 1;
  }

  return { refreshed, needsReauth, failed, skipped, details };
}

/**
 * Ensure the café's Square access token is usable for an immediate API call.
 * Refreshes when expiry is within the 7-day window.
 */
export async function ensureFreshSquareAccessToken(
  db: Db,
  cafeId: string,
  environment?: SquareClientEnvironment,
): Promise<PosConnectionSecrets | null> {
  const conn = await getPosConnection(db, cafeId, POS_PROVIDERS.square);
  if (!conn || conn.status !== 'active') return conn;

  const msUntilExpiry = conn.accessTokenExpiresAt.getTime() - Date.now();
  const msSinceRefresh = Date.now() - conn.lastRefreshedAt.getTime();
  const needsRefresh =
    msUntilExpiry < POS_TOKEN_REFRESH_WITHIN_MS ||
    msSinceRefresh > POS_TOKEN_REFRESH_WITHIN_MS;

  if (!needsRefresh) return conn;

  const result = await refreshSquareConnection(db, conn, environment);
  if (result.kind !== 'refreshed') return null;
  return getPosConnection(db, cafeId, POS_PROVIDERS.square);
}
