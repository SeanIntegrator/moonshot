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
} from '../../lib/orders-repository.js';
import { recomputePickupEtasForCafe } from '../../lib/pickup-eta.js';
import { emitKdsServerToClient } from '../../realtime/kds-events.js';
import { optionalCustomerAuth } from '../../middleware/optional-customer-auth.js';
import { requireAuth } from '../../middleware/auth.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const customerOrdersRouter: IRouter = Router();

customerOrdersRouter.get('/me', requireAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const userId = req.user!.userId;

  try {
    const { active, recent } = await listCustomerOrdersForUser({ cafeId, userId });
    const data: CustomerOrdersListResponse = { active, recent };
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

  try {
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
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});

customerOrdersRouter.post('/:orderId/cancel', optionalCustomerAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const rawId = req.params.orderId;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!orderId?.trim() || !UUID_RE.test(orderId.trim())) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid order id',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const trimmed = orderId.trim();
  const authorised = await loadCustomerAuthorisedOrder({ req, orderId: trimmed, cafeId });
  if (!authorised) {
    return res.status(404).json({
      ok: false,
      error: 'Order not found',
      code: ApiErrorCode.NOT_FOUND,
    });
  }

  try {
    const result = await cancelOrderAtCafe(trimmed, cafeId);

    if (result.kind === 'not_found') {
      return res.status(404).json({
        ok: false,
        error: 'Order not found',
        code: ApiErrorCode.NOT_FOUND,
      });
    }

    if (result.kind === 'not_cancellable') {
      return res.status(409).json({
        ok: false,
        error: 'Order cannot be cancelled in its current state',
        code: ApiErrorCode.CONFLICT,
      });
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
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});

customerOrdersRouter.get('/:orderId', optionalCustomerAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const rawId = req.params.orderId;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!orderId?.trim() || !UUID_RE.test(orderId.trim())) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid order id',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const trimmed = orderId.trim();
  const order = await loadCustomerAuthorisedOrder({ req, orderId: trimmed, cafeId });
  if (!order) {
    return res.status(404).json({
      ok: false,
      error: 'Order not found',
      code: ApiErrorCode.NOT_FOUND,
    });
  }

  return res.json({ ok: true, data: { order } });
});
