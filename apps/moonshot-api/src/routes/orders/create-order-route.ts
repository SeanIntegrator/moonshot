import type { CreateOrderResponse } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { IRouter } from 'express';
import { Router } from 'express';
import { ensureCafeMembership } from '../../lib/cafe/cafe-membership.js';
import { config } from '../../lib/config.js';
import { buildGuestTrackingTokenIfNeeded } from '../../lib/customer-socket-token.js';
import { ApiHttpError } from '../../lib/http-errors.js';
import { createGuestPayInStoreOrder } from '../../lib/orders/order-create.js';
import { notifyOrderReadyForKitchen } from '../../lib/orders/order-lifecycle-notify.js';
import { requireCustomerAuth } from '../../middleware/require-customer-auth.js';
import { pool } from '../../db.js';
import { createStripeCheckoutOrderResponse } from '../../lib/orders-checkout-service.js';
import { parseCreateOrderBody } from '../../lib/orders/parse-create-order-body.js';
import { parseOrderAheadPaymentMode } from '../../lib/orders/order-payment-mode.js';
import { resolveRequestedPickupNotBefore } from '../../lib/requested-pickup.js';

export const createOrderRouter: IRouter = Router();

createOrderRouter.post('/', requireCustomerAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const body = req.body as Record<string, unknown>;

  const parsed = parseCreateOrderBody(body);
  if (!parsed.ok) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, parsed.error);
  }

  const { customerName, notes, orderType, items, redeemRewardId, pickupDelayMinutes } = parsed.value;
  const userId = req.customerUserId ?? null;
  const paymentMode = parseOrderAheadPaymentMode(req.cafe!.features.order_ahead);
  const requestedPickupNotBefore = resolveRequestedPickupNotBefore({
    pickupDelayMinutes,
    orderAhead: req.cafe!.features.order_ahead,
  });

  const jwtSecret = config.jwtSecret;

  if (userId) {
    // Loyalty and order history need a cafe_users row; Google sign-in alone may not create one.
    await ensureCafeMembership({ db: pool, cafeId, userId });
  }

  if (paymentMode === 'pay_in_store') {
    const result = await createGuestPayInStoreOrder({
      cafeId,
      userId,
      customerName,
      notes: notes ?? null,
      orderType,
      lines: items,
      redeemRewardId,
      requestedPickupNotBefore,
    });

    await notifyOrderReadyForKitchen({
      db: pool,
      cafeId,
      order: result.order,
      kdsConfig: req.cafe!.kdsConfig,
    });

    const trackingToken = buildGuestTrackingTokenIfNeeded({
      orderId: result.order.id,
      cafeId,
      customerId: userId,
      jwtSecret,
    });
    const data: CreateOrderResponse = {
      order: result.order,
      discountMinor: result.discountMinor > 0 ? result.discountMinor : undefined,
      redeemedRewardId: result.redeemedRewardId,
      ...(trackingToken == null ? {} : { trackingToken }),
    };

    return res.status(201).json({ ok: true, data });
  }

  const data = await createStripeCheckoutOrderResponse({
    cafeId,
    cafeSlug: req.cafe!.slug,
    userId,
    customerName,
    notes,
    orderType,
    lines: items,
    paymentConfig: req.cafe!.paymentConfig,
    redeemRewardId,
    requestedPickupNotBefore,
  });

  return res.status(201).json({ ok: true, data });
});
