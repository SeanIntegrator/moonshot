import type { Request } from 'express';
import type { NormalisedOrder } from '@moonshot/types';
import { classifyCustomerSocketToken } from './customer-socket-token.js';
import { findOrderByIdAndCafe } from './orders-repository.js';

/**
 * Customer HTTP access model mirrors `/customer` socket subscribe:
 * session JWT when `orders.user_id` matches, or guest `trackingToken` query when user_id is null.
 */
export async function loadCustomerAuthorisedOrder(params: {
  req: Request;
  orderId: string;
  cafeId: string;
}): Promise<NormalisedOrder | null> {
  const { req, orderId, cafeId } = params;
  const order = await findOrderByIdAndCafe(orderId, cafeId);
  if (!order) return null;

  const sessionUserId = req.customerUserId;
  const jwtSecret = process.env.JWT_SECRET;
  const trackingRaw =
    typeof req.query.trackingToken === 'string' ? req.query.trackingToken : undefined;

  if (sessionUserId) {
    if (order.customerId === sessionUserId) return order;
    return null;
  }

  if (!jwtSecret || !trackingRaw?.trim()) return null;

  const classified = classifyCustomerSocketToken(trackingRaw.trim(), jwtSecret);
  if (classified.kind !== 'track_order') return null;
  if (classified.claims.orderId !== orderId || classified.claims.cafeId !== cafeId) return null;
  if (order.customerId != null) return null;

  return order;
}
