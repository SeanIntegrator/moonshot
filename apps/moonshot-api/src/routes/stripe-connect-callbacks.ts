import { Router, type NextFunction, type Request, type Response } from 'express';
import { adminRedirectWithStripeQuery } from '../lib/admin-stripe-connect-urls.js';
import {
  handleStripeConnectRefresh,
  handleStripeConnectReturn,
} from '../lib/admin-stripe-service.js';

async function stripeConnectReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  try {
    const { redirectUrl } = await handleStripeConnectReturn(state);
    res.redirect(302, redirectUrl);
  } catch {
    try {
      res.redirect(302, adminRedirectWithStripeQuery('error'));
    } catch (e) {
      next(e);
    }
  }
}

async function stripeConnectRefresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  try {
    const { redirectUrl } = await handleStripeConnectRefresh(state);
    res.redirect(302, redirectUrl);
  } catch {
    try {
      res.redirect(302, adminRedirectWithStripeQuery('error'));
    } catch (e) {
      next(e);
    }
  }
}

/** Stripe Account Link return/refresh — mounted at `/api/v1/admin/payments/stripe/*` and `/connect/*`. */
export const stripeConnectCallbacksRouter: Router = Router();
stripeConnectCallbacksRouter.get('/return', stripeConnectReturn);
stripeConnectCallbacksRouter.get('/refresh', stripeConnectRefresh);
