import type { CreateOrderResponse } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { IRouter } from 'express';
import { Router } from 'express';
import { buildGuestTrackingTokenIfNeeded } from '../../lib/customer-socket-token.js';
import { createGuestPayInStoreOrder } from '../../lib/orders-repository.js';
import { emitKdsServerToClient } from '../../realtime/kds-events.js';
import { optionalCustomerAuth } from '../../middleware/optional-customer-auth.js';
import { recomputePickupEtasForCafe } from '../../lib/pickup-eta.js';
import { pool } from '../../db.js';
import { createStripeCheckoutOrderResponse } from '../../lib/orders-checkout-service.js';
import { parseCreateOrderBody, parseOrderAheadPaymentMode } from '../../lib/order-checkout-env.js';

export const createOrderRouter: IRouter = Router();

createOrderRouter.post('/', optionalCustomerAuth, async (req, res) => {
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

    const trackingToken = buildGuestTrackingTokenIfNeeded({
      orderId: order.id,
      cafeId,
      customerId: userId,
      jwtSecret,
    });
    const data: CreateOrderResponse =
      trackingToken == null ? { order } : { order, trackingToken };

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
});
