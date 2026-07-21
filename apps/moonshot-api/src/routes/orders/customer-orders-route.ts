import type {
  CancelOrderResponse,
  CustomerOrdersListResponse,
  PickupEstimateResponse,
} from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { IRouter } from 'express';
import { Router } from 'express';
import { pool } from '../../db.js';
import { loadCustomerAuthorisedOrder } from '../../lib/order-customer-access.js';
import { estimateTailPickupForCafe } from '../../lib/pickup-eta-estimate.js';
import {
  cancelOrderAtCafe,
  listCustomerOrdersForUser,
} from '../../lib/orders/order-customer.js';
import { UUID_RE } from '../../lib/uuid.js';
import { recomputePickupEtasForCafe } from '../../lib/pickup-eta.js';
import { emitKdsServerToClient } from '../../realtime/kds-events.js';
import { optionalCustomerAuth } from '../../middleware/optional-customer-auth.js';
import { requireAuth } from '../../middleware/auth.js';
import { ApiHttpError } from '../../lib/http-errors.js';

export const customerOrdersRouter: IRouter = Router();

customerOrdersRouter.get('/me', requireAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const userId = req.user!.userId;

  const { active, recent } = await listCustomerOrdersForUser({ cafeId, userId });
  const data: CustomerOrdersListResponse = { active, recent };
  return res.json({ ok: true, data });
});

customerOrdersRouter.get('/pickup-estimate', async (req, res) => {
  const orderAhead = req.cafe!.features.order_ahead;
  if (!orderAhead?.pickupTimeEnabled) {
    const minutes = orderAhead?.defaultPickupMinutes ?? 15;
    const pickupIso = new Date(Date.now() + minutes * 60_000).toISOString();
    const data: PickupEstimateResponse = {
      pickupTime: pickupIso,
      minutesFromNow: Math.max(1, minutes),
    };
    return res.json({ ok: true, data });
  }

  const { pickupIso, minutesFromNow } = await estimateTailPickupForCafe({
    db: pool,
    cafeId: req.cafe!.cafeId,
    kdsConfig: req.cafe!.kdsConfig,
  });
  const data: PickupEstimateResponse = {
    pickupTime: pickupIso,
    minutesFromNow,
  };
  return res.json({ ok: true, data });
});

customerOrdersRouter.post('/:orderId/cancel', optionalCustomerAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const rawId = req.params.orderId;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!orderId?.trim() || !UUID_RE.test(orderId.trim())) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid order id');
  }

  const trimmed = orderId.trim();
  const authorised = await loadCustomerAuthorisedOrder({ req, orderId: trimmed, cafeId });
  if (!authorised) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Order not found');
  }

  const result = await cancelOrderAtCafe(trimmed, cafeId);

  if (result.kind === 'not_found') {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Order not found');
  }

  if (result.kind === 'not_cancellable') {
    throw new ApiHttpError(
      409,
      ApiErrorCode.CONFLICT,
      'Order cannot be cancelled in its current state',
    );
  }

  if (result.kind === 'already_cancelled') {
    const order = result.order;
    const data: CancelOrderResponse = {
      order,
      refundPending: order.paymentStatus === 'paid',
    };
    return res.json({ ok: true, data });
  }

  const order = result.order;

  emitKdsServerToClient(cafeId, { type: 'kds:order:removed', orderId: trimmed });
  await recomputePickupEtasForCafe({
    db: pool,
    cafeId,
    kdsConfig: req.cafe!.kdsConfig,
  });

  const refundPending = order.paymentStatus === 'paid';

  const data: CancelOrderResponse = { order, refundPending };
  return res.json({ ok: true, data });
});

customerOrdersRouter.get('/:orderId', optionalCustomerAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const rawId = req.params.orderId;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!orderId?.trim() || !UUID_RE.test(orderId.trim())) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid order id');
  }

  const trimmed = orderId.trim();
  const order = await loadCustomerAuthorisedOrder({ req, orderId: trimmed, cafeId });
  if (!order) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Order not found');
  }

  return res.json({ ok: true, data: { order } });
});
