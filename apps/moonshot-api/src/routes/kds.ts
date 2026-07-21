import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  ApiErrorCode,
  type KdsCompleteOrderResponse,
  type KdsLoginResponse,
  type KdsOrdersResponse,
} from '@moonshot/types';
import { findCafeById, findCafeBySlug } from '../lib/cafes-repository.js';
import { verifyKdsPassword } from '../lib/kds-password.js';
import { findKdsUserForLogin, touchKdsUserLogin } from '../lib/kds-users-repository.js';
import { completeOrderForKds, listOpenOrdersForKds } from '../lib/orders/order-kds.js';
import { applyLoyaltyAfterKdsComplete } from '../lib/loyalty-after-kds-complete.js';
import { recomputePickupEtasForCafe } from '../lib/pickup-eta.js';
import { emitCustomerServerToClient } from '../realtime/customer-events.js';
import { emitKdsServerToClient } from '../realtime/kds-events.js';
import { requireKdsAuth } from '../middleware/kds-auth.js';
import { pool } from '../db.js';
import { ApiHttpError } from '../lib/http-errors.js';

export const kdsRouter: Router = Router();

kdsRouter.post('/auth/login', async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const cafeSlug = typeof body.cafeSlug === 'string' ? body.cafeSlug.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!cafeSlug || !username || !password) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'cafeSlug, username, and password are required');
  }

  const jwtSecret = process.env.JWT_SECRET;
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

  /**
   * Post-success side-effects must never fail the KDS request: the order row is
   * already `completed`, the kitchen has moved on, and a 500 here would make
   * "Done" look broken even though the work succeeded. Log + swallow.
   */
  emitKdsServerToClient(cafeId, { type: 'kds:order:removed', orderId });

  const completedAt = order.pickup.completedAt;
  if (completedAt) {
    emitCustomerServerToClient(orderId, {
      type: 'customerOrderCompleted',
      orderId,
      cafeId,
      completedAt,
      userId: order.customerId,
    });
  }

  try {
    await applyLoyaltyAfterKdsComplete({ cafeId, order });
  } catch (e) {
    console.error('[kds.complete] loyalty post-success failure (swallowed)', {
      cafeId,
      orderId,
      customerId: order.customerId,
      paymentStatus: order.paymentStatus,
      err: e,
    });
  }

  try {
    const cafeReload = await findCafeById(cafeId);
    if (cafeReload) {
      await recomputePickupEtasForCafe({
        db: pool,
        cafeId,
        kdsConfig: cafeReload.kdsConfig,
      });
    }
  } catch (e) {
    console.error('[kds.complete] ETA recompute failure (swallowed)', {
      cafeId,
      orderId,
      err: e,
    });
  }

  const data: KdsCompleteOrderResponse = { order };
  return res.json({ ok: true, data });
});
