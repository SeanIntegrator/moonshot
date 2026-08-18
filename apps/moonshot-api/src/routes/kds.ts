import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  ApiErrorCode,
  type KdsAdvanceStatusResponse,
  type KdsCompleteOrderResponse,
  type KdsConfigResponse,
  type KdsLoginResponse,
  type KdsOrdersResponse,
  type KdsRecallLastOrderResponse,
  type KdsRecallOrderResponse,
  type KdsRecentOrdersResponse,
  type KdsStretchEtaResponse,
} from '@moonshot/types';
import { findCafeById, findCafeBySlug } from '../lib/cafes-repository.js';
import { listOutOptionIds } from '../lib/menu/option-availability.js';
import { config } from '../lib/config.js';
import { verifyKdsPassword } from '../lib/kds-password.js';
import { findKdsUserForLogin, touchKdsUserLogin } from '../lib/kds-users-repository.js';
import {
  advanceOrderStatusForKds,
  completeOrderForKds,
  listOpenOrdersForKds,
  listRecentCompletedOrdersForKds,
  recallCompletedOrderForKds,
  recallLastCompletedOrderForKds,
  stretchOrderEtaForKds,
} from '../lib/orders/order-kds.js';
import {
  notifyOrderCompleted,
  notifyOrderRecalled,
  notifyOrderStatusAdvanced,
} from '../lib/orders/order-lifecycle-notify.js';
import { emitCustomerServerToClient } from '../realtime/customer-events.js';
import { emitKdsServerToClient } from '../realtime/kds-events.js';
import { requireKdsAuth } from '../middleware/kds-auth.js';
import { pool } from '../db.js';
import { ApiHttpError } from '../lib/http-errors.js';
import { kdsLoginBodySchema, parseBody } from '../lib/validation/auth-bodies.js';

export const kdsRouter: Router = Router();

kdsRouter.post('/auth/login', async (req, res) => {
  const parsed = parseBody(kdsLoginBodySchema, req.body);
  if (!parsed.ok) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'cafeSlug, username, and password are required');
  }
  const { cafeSlug, username, password } = parsed.data;

  const jwtSecret = config.jwtSecret;
  if (!jwtSecret) {
    throw new ApiHttpError(500, ApiErrorCode.CONFIG, 'Server JWT configuration missing');
  }

  const cafe = await findCafeBySlug(cafeSlug);
  if (!cafe) {
    throw new ApiHttpError(401, ApiErrorCode.UNAUTHORIZED, 'Invalid café or credentials');
  }

  const kdsUser = await findKdsUserForLogin(cafe.cafeId, username);
  if (!kdsUser || !verifyKdsPassword(password, kdsUser.password_hash)) {
    throw new ApiHttpError(401, ApiErrorCode.UNAUTHORIZED, 'Invalid café or credentials');
  }

  await touchKdsUserLogin(kdsUser.id);

  const token = jwt.sign(
    {
      sub: kdsUser.id,
      kdsUserId: kdsUser.id,
      cafeId: cafe.cafeId,
      cafeSlug: cafe.slug,
      purpose: 'kds',
    },
    jwtSecret,
    { expiresIn: '90d' },
  );

  const data: KdsLoginResponse = {
    token,
    cafe: { id: cafe.cafeId, slug: cafe.slug, name: cafe.name },
    kdsUser: {
      id: kdsUser.id,
      username: kdsUser.username,
      displayName: kdsUser.display_name,
    },
  };
  return res.json({ ok: true, data });
});

kdsRouter.get('/orders', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;
  const orders = await listOpenOrdersForKds(cafeId);
  const data: KdsOrdersResponse = { orders };
  return res.json({ ok: true, data });
});

/**
 * Recently completed orders for the Recent orders dialog.
 * Registered before `/:orderId` routes so `recent` is not captured as an id.
 */
kdsRouter.get('/orders/recent', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;
  const orders = await listRecentCompletedOrdersForKds(cafeId);
  const data: KdsRecentOrdersResponse = { orders };
  return res.json({ ok: true, data });
});

kdsRouter.get('/config', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;
  const cafe = await findCafeById(cafeId);
  if (!cafe) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  return res.json({
    ok: true,
    data: {
      kdsConfig: cafe.kdsConfig,
      outOptionIds: await listOutOptionIds(pool, cafeId),
    } satisfies KdsConfigResponse,
  });
});

/**
 * Instant recall: reopen the café's most recently completed order as `confirmed`.
 * Registered before `/:orderId` routes so `recall-last` is not captured as an id.
 */
kdsRouter.post('/orders/recall-last', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;

  let order;
  try {
    order = await recallLastCompletedOrderForKds(cafeId);
  } catch (e) {
    console.error('[kds.recall-last] DB error while recalling order', { cafeId, err: e });
    throw e;
  }

  if (!order) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'No completed order to recall');
  }

  await notifyOrderRecalled({ db: pool, cafeId, order, logTag: 'kds.recall-last' });

  const data: KdsRecallLastOrderResponse = { order };
  return res.json({ ok: true, data });
});

/**
 * Recall a specific completed order back onto the board as `confirmed`.
 */
kdsRouter.post('/orders/:orderId/recall', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;
  const orderId = typeof req.params.orderId === 'string' ? req.params.orderId : '';
  if (!orderId.trim()) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'orderId is required');
  }

  let order;
  try {
    order = await recallCompletedOrderForKds(orderId, cafeId);
  } catch (e) {
    console.error('[kds.recall] DB error while recalling order', { cafeId, orderId, err: e });
    throw e;
  }

  if (!order) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Order not found or not recallable');
  }

  await notifyOrderRecalled({ db: pool, cafeId, order, logTag: 'kds.recall' });

  const data: KdsRecallOrderResponse = { order };
  return res.json({ ok: true, data });
});

kdsRouter.post('/orders/:orderId/status', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;
  const orderId = typeof req.params.orderId === 'string' ? req.params.orderId : '';
  const body = req.body as Record<string, unknown>;
  const nextStatus = body.status;

  if (!orderId.trim()) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'orderId is required');
  }
  if (nextStatus !== 'confirmed' && nextStatus !== 'preparing' && nextStatus !== 'ready') {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'status must be confirmed, preparing, or ready',
    );
  }

  const order = await advanceOrderStatusForKds(orderId, cafeId, nextStatus);
  if (!order) {
    throw new ApiHttpError(
      404,
      ApiErrorCode.NOT_FOUND,
      'Order not found or status transition not allowed',
    );
  }

  notifyOrderStatusAdvanced({ cafeId, order });

  const data: KdsAdvanceStatusResponse = { order };
  return res.json({ ok: true, data });
});

kdsRouter.post('/orders/:orderId/eta', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;
  const orderId = typeof req.params.orderId === 'string' ? req.params.orderId : '';
  const body = req.body as Record<string, unknown>;
  const pickupTime = typeof body.pickupTime === 'string' ? body.pickupTime.trim() : '';

  if (!orderId.trim()) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'orderId is required');
  }
  if (!pickupTime || !Number.isFinite(Date.parse(pickupTime))) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'pickupTime must be a valid ISO datetime');
  }

  const order = await stretchOrderEtaForKds(orderId, cafeId, pickupTime);
  if (!order) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Order not found or not open');
  }

  const pickupIso = order.pickup.pickupTime;
  if (pickupIso) {
    emitKdsServerToClient(cafeId, {
      type: 'kds:eta:updated',
      updates: [{ orderId, pickupTime: pickupIso }],
    });
    emitCustomerServerToClient(orderId, {
      type: 'customerEtaUpdated',
      updates: [{ orderId, pickupTime: pickupIso }],
    });
  }

  const data: KdsStretchEtaResponse = { order };
  return res.json({ ok: true, data });
});

kdsRouter.post('/orders/:orderId/complete', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;
  const orderId = typeof req.params.orderId === 'string' ? req.params.orderId : '';
  if (!orderId.trim()) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'orderId is required');
  }

  let order;
  try {
    order = await completeOrderForKds(orderId, cafeId);
  } catch (e) {
    /* Annotate with route-specific context, then re-throw so the global
     * handler produces the canonical 500 envelope. */
    console.error('[kds.complete] DB error while completing order', { cafeId, orderId, err: e });
    throw e;
  }

  if (!order) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Order not found or not completable');
  }

  await notifyOrderCompleted({ db: pool, cafeId, order });

  const data: KdsCompleteOrderResponse = { order };
  return res.json({ ok: true, data });
});
