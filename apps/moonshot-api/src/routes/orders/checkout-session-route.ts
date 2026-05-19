import type { CreateOrderResponse } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { IRouter } from 'express';
import { Router } from 'express';
import { signTrackOrderJwt } from '../../lib/customer-socket-token.js';
import { findOrderByStripeCheckoutSessionForCafe } from '../../lib/orders-repository.js';
import { isStripeCheckoutSessionIdWellFormed } from '../../lib/stripe-checkout-session-id.js';

export const checkoutSessionRouter: IRouter = Router();

checkoutSessionRouter.get('/checkout-session/:sessionId', async (req, res) => {
  try {
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
    const order = await findOrderByStripeCheckoutSessionForCafe(sessionId, cafeId);
    if (!order) {
      return res.status(404).json({
        ok: false,
        error: 'Order not found for this checkout session',
        code: ApiErrorCode.NOT_FOUND,
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    const data: CreateOrderResponse =
      order.customerId != null || !jwtSecret
        ? { order }
        : {
            order,
            trackingToken: signTrackOrderJwt({
              orderId: order.id,
              cafeId,
              secret: jwtSecret,
            }),
          };

    return res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});
