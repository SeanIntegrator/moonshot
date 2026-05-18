import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  ApiErrorCode,
  type KdsCompleteOrderResponse,
  type KdsLoginResponse,
  type KdsOrdersResponse,
} from '@moonshot/types';
import { mapCafeRow } from '../lib/cafe-map.js';
import { verifyKdsPassword } from '../lib/kds-password.js';
import { findKdsUserForLogin, touchKdsUserLogin } from '../lib/kds-users-repository.js';
import { completeOrderForKds, listOpenOrdersForKds } from '../lib/orders-repository.js';
import { applyLoyaltyAfterKdsComplete } from '../lib/loyalty-after-kds-complete.js';
import { recomputePickupEtasForCafe } from '../lib/pickup-eta.js';
import { emitCustomerServerToClient } from '../realtime/customer-events.js';
import { emitKdsServerToClient } from '../realtime/kds-events.js';
import { requireKdsAuth } from '../middleware/kds-auth.js';
import { pool } from '../db.js';

export const kdsRouter: Router = Router();

kdsRouter.post('/auth/login', async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const cafeSlug = typeof body.cafeSlug === 'string' ? body.cafeSlug.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!cafeSlug || !username || !password) {
    return res.status(400).json({
      ok: false,
      error: 'cafeSlug, username, and password are required',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Server JWT configuration missing',
      code: ApiErrorCode.CONFIG,
    });
  }

  try {
    const cafeResult = await pool.query(
      `SELECT
        id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
        features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email
      FROM cafes
      WHERE slug = $1`,
      [cafeSlug],
    );
    if (cafeResult.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid café or credentials',
        code: ApiErrorCode.UNAUTHORIZED,
      });
    }

    const cafeRow = cafeResult.rows[0] as Parameters<typeof mapCafeRow>[0];
    const cafe = mapCafeRow(cafeRow);
    const kdsUser = await findKdsUserForLogin(cafe.cafeId, username);
    if (!kdsUser || !verifyKdsPassword(password, kdsUser.password_hash)) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid café or credentials',
        code: ApiErrorCode.UNAUTHORIZED,
      });
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
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});

kdsRouter.get('/orders', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;
  try {
    const orders = await listOpenOrdersForKds(cafeId);
    const data: KdsOrdersResponse = { orders };
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

kdsRouter.post('/orders/:orderId/complete', requireKdsAuth, async (req, res) => {
  const cafeId = req.kdsUser!.cafeId;
  const orderId = typeof req.params.orderId === 'string' ? req.params.orderId : '';
  if (!orderId.trim()) {
    return res.status(400).json({
      ok: false,
      error: 'orderId is required',
      code: ApiErrorCode.VALIDATION,
    });
  }
  try {
    const order = await completeOrderForKds(orderId, cafeId);
    if (!order) {
      return res.status(404).json({
        ok: false,
        error: 'Order not found or not completable',
        code: ApiErrorCode.NOT_FOUND,
      });
    }
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

    await applyLoyaltyAfterKdsComplete({ cafeId, order });

    const cafeReload = await pool.query(
      `SELECT
        id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
        features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email
      FROM cafes WHERE id = $1`,
      [cafeId],
    );
    if (cafeReload.rows.length > 0) {
      const mapped = mapCafeRow(cafeReload.rows[0] as Parameters<typeof mapCafeRow>[0]);
      await recomputePickupEtasForCafe({
        db: pool,
        cafeId,
        kdsConfig: mapped.kdsConfig,
      });
    }

    const data: KdsCompleteOrderResponse = { order };
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
