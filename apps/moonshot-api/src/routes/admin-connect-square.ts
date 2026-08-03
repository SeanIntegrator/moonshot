import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { POS_PROVIDERS } from '@moonshot/domain';
import { pool } from '../db.js';
import { ApiHttpError } from '../lib/http-errors.js';
import {
  deletePosConnection,
  getPosConnection,
  getPosConnectionPublicStatus,
  upsertPosConnection,
} from '../lib/pos-connections-repository.js';
import { createSquareAppClient, createSquareClient } from '../lib/pos-adapters/square/client.js';
import {
  adminRedirectWithSquareQuery,
  buildSquareAuthorizeUrl,
  resolveSquareApplicationId,
  resolveSquareApplicationSecret,
  resolveSquareOAuthRedirectUrl,
  SQUARE_OAUTH_SCOPES,
  verifySquareConnectState,
} from '../lib/square/oauth-urls.js';
import { requireAdminAuth } from '../middleware/admin-auth.js';

export const adminConnectSquareRouter: Router = createRouter();

adminConnectSquareRouter.post('/onboard', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  try {
    const { url } = buildSquareAuthorizeUrl(cafeId);
    return res.json({
      ok: true,
      data: { url, scopes: [...SQUARE_OAUTH_SCOPES] },
    });
  } catch (err) {
    if (err instanceof ApiHttpError) {
      return res.status(err.status).json({ ok: false, error: err.message, code: err.code });
    }
    throw err;
  }
});

adminConnectSquareRouter.get('/status', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const status = await getPosConnectionPublicStatus(pool, cafeId, POS_PROVIDERS.square);

  let locations: Array<{ id: string; name: string }> = [];
  if (status?.connected) {
    try {
      const conn = await getPosConnection(pool, cafeId, POS_PROVIDERS.square);
      if (conn) {
        const client = createSquareClient({ accessToken: conn.accessToken });
        const locRes = await client.locations.list();
        locations = (locRes.locations ?? [])
          .filter((l) => l.id && l.status !== 'INACTIVE')
          .map((l) => ({ id: l.id!, name: l.name ?? l.id! }));
      }
    } catch {
      // Token may be stale — still return connection metadata without locations.
    }
  }

  return res.json({
    ok: true,
    data: {
      connected: status?.connected ?? false,
      merchantId: status?.merchantId ?? null,
      locationId: status?.locationId ?? null,
      tokenExpiresAt: status?.tokenExpiresAt ?? null,
      status: status?.status ?? null,
      catalogLastSyncedAt: status?.catalogLastSyncedAt ?? null,
      catalogSyncStatus: status?.catalogSyncStatus ?? null,
      catalogSyncError: status?.catalogSyncError ?? null,
      locations,
    },
  });
});

adminConnectSquareRouter.post('/disconnect', requireAdminAuth, async (req, res) => {
  const cafeId = req.adminUser!.cafeId;
  const conn = await getPosConnection(pool, cafeId, POS_PROVIDERS.square);
  if (conn) {
    try {
      const appClient = createSquareAppClient();
      await appClient.oAuth.revokeToken({
        clientId: resolveSquareApplicationId(),
        accessToken: conn.accessToken,
      }, {
        headers: {
          Authorization: `Client ${resolveSquareApplicationSecret()}`,
        },
      });
    } catch {
      // Best-effort revoke — still drop local credentials.
    }
    await deletePosConnection(pool, cafeId, POS_PROVIDERS.square);
  }

  await pool.query(
    `UPDATE cafes SET pos_provider = $1 WHERE id = $2 AND pos_provider = $3`,
    [POS_PROVIDERS.manual, cafeId, POS_PROVIDERS.square],
  );

  return res.json({ ok: true, data: { disconnected: true } });
});

/**
 * Square OAuth return — public browser redirect with signed `state`.
 * Exchanges the authorization code, stores encrypted tokens, flips pos_provider.
 */
adminConnectSquareRouter.get('/return', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const error = typeof req.query.error === 'string' ? req.query.error : '';

  if (error || !code) {
    return res.redirect(302, adminRedirectWithSquareQuery('error', {
      reason: error || 'missing_code',
    }));
  }

  const claims = verifySquareConnectState(state);
  if (!claims) {
    return res.redirect(302, adminRedirectWithSquareQuery('error', { reason: 'invalid_state' }));
  }

  try {
    const appClient = createSquareAppClient();
    const tokenRes = await appClient.oAuth.obtainToken({
      clientId: resolveSquareApplicationId(),
      clientSecret: resolveSquareApplicationSecret(),
      code,
      grantType: 'authorization_code',
      redirectUri: resolveSquareOAuthRedirectUrl(),
    });

    const accessToken = tokenRes.accessToken;
    const refreshToken = tokenRes.refreshToken;
    const merchantId = tokenRes.merchantId;
    if (!accessToken || !refreshToken || !merchantId) {
      return res.redirect(302, adminRedirectWithSquareQuery('error', { reason: 'token_incomplete' }));
    }

    const expiresAt = tokenRes.expiresAt
      ? new Date(tokenRes.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Prefer the first active location as default.
    let locationId: string | null = null;
    try {
      const sellerClient = createSquareClient({ accessToken });
      const locRes = await sellerClient.locations.list();
      const first = (locRes.locations ?? []).find((l) => l.id && l.status !== 'INACTIVE');
      locationId = first?.id ?? null;
    } catch {
      // Location discovery is best-effort at connect time.
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await upsertPosConnection(client, {
        cafeId: claims.cafeId,
        provider: POS_PROVIDERS.square,
        merchantId,
        locationId,
        accessToken,
        refreshToken,
        accessTokenExpiresAt: expiresAt,
        scopes: [...SQUARE_OAUTH_SCOPES],
      });
      await client.query(`UPDATE cafes SET pos_provider = $1 WHERE id = $2`, [
        POS_PROVIDERS.square,
        claims.cafeId,
      ]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return res.redirect(302, adminRedirectWithSquareQuery('connected'));
  } catch {
    return res.redirect(302, adminRedirectWithSquareQuery('error', { reason: 'exchange_failed' }));
  }
});
