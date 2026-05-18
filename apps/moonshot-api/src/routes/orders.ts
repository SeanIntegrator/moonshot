import { Router } from 'express';
import type { CreateOrderResponse } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../lib/http-errors.js';
import { signTrackOrderJwt } from '../lib/customer-socket-token.js';
import {
  createGuestPayInStoreOrder,
  findOrderByStripeCheckoutSessionForCafe,
} from '../lib/orders-repository.js';
import { emitKdsServerToClient } from '../realtime/kds-events.js';
import { optionalCustomerAuth } from '../middleware/optional-customer-auth.js';
import { requireCafeContext } from '../middleware/cafe-context.js';
import { recomputePickupEtasForCafe } from '../lib/pickup-eta.js';
import { pool } from '../db.js';
import { createStripeCheckoutOrderResponse } from '../lib/orders-checkout-service.js';
import {
  parseCreateOrderBody,
  parseOrderAheadPaymentMode,
} from '../lib/order-checkout-env.js';
import { isStripeCheckoutSessionIdWellFormed } from '../lib/stripe-checkout-session-id.js';

export const ordersRouter: Router = Router();

ordersRouter.use(requireCafeContext);

ordersRouter.get('/checkout-session/:sessionId', async (req, res) => {
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

ordersRouter.post('/', optionalCustomerAuth, async (req, res) => {
  try {
    const cafeId = req.cafe!.cafeId;
    const body = req.body as Record<string, unknown>;

    const parsed = parseCreateOrderBody(body);
    if (!parsed.ok) {
      return res.status(400).json({
        ok: false,
        error: parsed.error,
        code: ApiErrorCode.VALIDATION,
      });
    }

    const { customerName, notes, orderType, items } = parsed.value;
    const userId = req.customerUserId ?? null;
    const paymentMode = parseOrderAheadPaymentMode(req.cafe!.features.order_ahead);

    const jwtSecret = process.env.JWT_SECRET;

    if (paymentMode === 'pay_in_store') {
      const order = await createGuestPayInStoreOrder({
        cafeId,
        userId,
        customerName,
        notes: notes ?? null,
        orderType,
        lines: items,
      });

      emitKdsServerToClient(cafeId, { type: 'kds:order:new', order });
      await recomputePickupEtasForCafe({
        db: pool,
        cafeId,
        kdsConfig: req.cafe!.kdsConfig,
      });

      const data: CreateOrderResponse =
        userId != null || !jwtSecret
          ? { order }
          : {
              order,
              trackingToken: signTrackOrderJwt({
                orderId: order.id,
                cafeId,
                secret: jwtSecret,
              }),
            };

      return res.status(201).json({ ok: true, data });
    }

    const data = await createStripeCheckoutOrderResponse({
      cafeId,
      userId,
      customerName,
      notes,
      orderType,
      lines: items,
      paymentConfig: req.cafe!.paymentConfig,
    });

    return res.status(201).json({ ok: true, data });
  } catch (e) {
    if (e instanceof ApiHttpError) {
      return res.status(e.status).json({
        ok: false,
        error: e.message,
        code: e.code,
      });
    }
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});
