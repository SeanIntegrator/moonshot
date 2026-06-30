import type { CreateOrderResponse } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { IRouter } from 'express';
import { Router } from 'express';
import { buildGuestTrackingTokenIfNeeded } from '../../lib/customer-socket-token.js';
import { recoverOrderFromStripeCheckoutSession } from '../../lib/orders/checkout-session-recovery.js';
import { isStripeCheckoutSessionIdWellFormed } from '../../lib/stripe-checkout-session-id.js';

export const checkoutSessionRouter: IRouter = Router();

checkoutSessionRouter.get('/checkout-session/:sessionId', async (req, res) => {
  const raw = req.params.sessionId;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  if (!sessionId || !isStripeCheckoutSessionIdWellFormed(sessionId)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid checkout session id',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const cafeId = req.cafe!.cafeId;
  const order = await recoverOrderFromStripeCheckoutSession({ sessionId, cafeId });
  if (!order) {
    return res.status(404).json({
      ok: false,
      error: 'Order not found for this checkout session',
      code: ApiErrorCode.NOT_FOUND,
    });
  }

  const trackingToken = buildGuestTrackingTokenIfNeeded({
    orderId: order.id,
    cafeId,
    customerId: order.customerId,
    jwtSecret: process.env.JWT_SECRET,
  });
  const data: CreateOrderResponse =
    trackingToken == null ? { order } : { order, trackingToken };

  return res.json({ ok: true, data });
});
