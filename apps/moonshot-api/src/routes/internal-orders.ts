import { Router } from 'express';
import { requireCronSecret } from '../middleware/cron-auth.js';
import { expireStaleOpenOrders } from '../lib/orders/order-expire-stale.js';

/**
 * Internal order jobs — authenticated with CRON_SECRET (Railway cron caller).
 */
export const internalOrdersRouter: Router = Router();

internalOrdersRouter.use(requireCronSecret);

/**
 * Cancel open orders older than the KDS board window (`auto_expire`).
 * Recommended schedule: hourly (idempotent).
 */
internalOrdersRouter.post('/expire-stale', async (_req, res) => {
  const result = await expireStaleOpenOrders();
  return res.json({
    ok: true,
    data: {
      expired: result.expired,
      byCafe: result.byCafe,
    },
  });
});
