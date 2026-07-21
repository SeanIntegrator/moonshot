import type { CreateOrderResponse } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { IRouter } from 'express';
import { Router } from 'express';
import { buildGuestTrackingTokenIfNeeded } from '../../lib/customer-socket-token.js';
import { ApiHttpError } from '../../lib/http-errors.js';
import { recoverOrderFromStripeCheckoutSession } from '../../lib/orders/checkout-session-recovery.js';
import { isStripeCheckoutSessionIdWellFormed } from '../../lib/stripe-checkout-session-id.js';

export const checkoutSessionRouter: IRouter = Router();

checkoutSessionRouter.get('/checkout-session/:sessionId', async (req, res) => {
  const raw = req.params.sessionId;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  if (!sessionId || !isStripeCheckoutSessionIdWellFormed(sessionId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid checkout session id');
  }

  const cafeId = req.cafe!.cafeId;
  const order = await recoverOrderFromStripeCheckoutSession({ sessionId, cafeId });
  if (!order) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Order not found for this checkout session');
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
