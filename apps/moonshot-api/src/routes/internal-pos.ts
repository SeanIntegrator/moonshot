import { Router } from 'express';
import { pool } from '../db.js';
import { requireCronSecret } from '../middleware/cron-auth.js';
import { refreshDueSquareTokens } from '../lib/pos-adapters/square/token-refresh.js';
import { syncStaleCatalogs } from '../lib/pos-adapters/square/catalog-sync.js';

/**
 * Internal POS jobs — authenticated with CRON_SECRET (Railway cron caller).
 */
export const internalPosRouter: Router = Router();

internalPosRouter.use(requireCronSecret);

/**
 * Refresh Square OAuth access tokens due within 7 days.
 * Idempotent — safe to run hourly.
 */
internalPosRouter.post('/refresh-tokens', async (_req, res) => {
  const result = await refreshDueSquareTokens(pool);
  return res.json({
    ok: true,
    data: {
      refreshed: result.refreshed,
      needsReauth: result.needsReauth,
      failed: result.failed,
      skipped: result.skipped,
    },
  });
});

/**
 * Safety-net catalog sync for cafés not synced in the last day.
 * Recommended schedule: daily.
 */
internalPosRouter.post('/sync-catalogs', async (_req, res) => {
  const result = await syncStaleCatalogs(pool);
  return res.json({
    ok: true,
    data: {
      synced: result.synced,
      failed: result.failed,
    },
  });
});
