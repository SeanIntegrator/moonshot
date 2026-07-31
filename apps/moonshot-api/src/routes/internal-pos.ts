import { Router } from 'express';
import { pool } from '../db.js';
import { requireCronSecret } from '../middleware/cron-auth.js';
import { refreshDueSquareTokens } from '../lib/pos-adapters/square/token-refresh.js';

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
