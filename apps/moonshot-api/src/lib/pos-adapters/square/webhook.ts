import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WebhookRequestLike } from '@moonshot/types';

/**
 * Square signs `{notificationUrl}{rawBody}` with HMAC-SHA-256 (base64).
 * Use the exact notification URL registered in the Developer Dashboard.
 */
export function verifySquareWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  signatureKey: string;
  notificationUrl: string;
}): boolean {
  const { rawBody, signatureHeader, signatureKey, notificationUrl } = params;
  if (!signatureHeader || !signatureKey || !notificationUrl) return false;

  const expected = createHmac('sha256', signatureKey)
    .update(notificationUrl + rawBody, 'utf8')
    .digest('base64');

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function resolveSquareWebhookNotificationUrl(): string {
  const explicit = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000/api/v1/webhooks/square';
  }

  return 'https://moonshotapi-production.up.railway.app/api/v1/webhooks/square';
}

export function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  return null;
}

export function rawBodyToString(req: WebhookRequestLike): string {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (req.rawBody instanceof Uint8Array) {
    return Buffer.from(req.rawBody).toString('utf8');
  }
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body != null) return JSON.stringify(req.body);
  return '';
}

export function verifySquareWebhookRequest(req: WebhookRequestLike): boolean {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  if (!signatureKey) return false;
  const signature =
    headerValue(req.headers, 'x-square-hmacsha256-signature') ??
    headerValue(req.headers, 'X-Square-HmacSha256-Signature');
  if (!signature) return false;
  return verifySquareWebhookSignature({
    rawBody: rawBodyToString(req),
    signatureHeader: signature,
    signatureKey,
    notificationUrl: resolveSquareWebhookNotificationUrl(),
  });
}

/** Order event types we act on (app-level subscription). */
export const SQUARE_ORDER_WEBHOOK_TYPES = new Set([
  'order.created',
  'order.updated',
  'order.fulfillment.updated',
]);

export const SQUARE_CATALOG_WEBHOOK_TYPE = 'catalog.version.updated';

export type SquareWebhookEnvelope = {
  eventId: string;
  merchantId: string;
  type: string;
  /** Present on order.* events when Square includes the id in data.object */
  orderId: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

/**
 * Pull merchant_id / event_id / order id from a Square notification body.
 * Payloads are thin — full order is fetched separately via Orders API.
 */
export function parseSquareWebhookEnvelope(body: unknown): SquareWebhookEnvelope | null {
  const root = asRecord(body);
  if (!root) return null;

  const eventId = typeof root.event_id === 'string' ? root.event_id : null;
  const merchantId = typeof root.merchant_id === 'string' ? root.merchant_id : null;
  const type = typeof root.type === 'string' ? root.type : null;
  if (!eventId || !merchantId || !type) return null;

  let orderId: string | null = null;
  const data = asRecord(root.data);
  const object = data ? asRecord(data.object) : null;
  if (object) {
    if (typeof object.order_id === 'string') orderId = object.order_id;
    const orderCreated = asRecord(object.order_created);
    if (!orderId && orderCreated && typeof orderCreated.order_id === 'string') {
      orderId = orderCreated.order_id;
    }
    const orderUpdated = asRecord(object.order_updated);
    if (!orderId && orderUpdated && typeof orderUpdated.order_id === 'string') {
      orderId = orderUpdated.order_id;
    }
    const order = asRecord(object.order);
    if (!orderId && order && typeof order.id === 'string') orderId = order.id;
    // fulfillment.updated nests order_id on the fulfillment object
    const fulfillmentUpdate = asRecord(object.order_fulfillment_updated);
    if (!orderId && fulfillmentUpdate && typeof fulfillmentUpdate.order_id === 'string') {
      orderId = fulfillmentUpdate.order_id;
    }
  }

  return { eventId, merchantId, type, orderId };
}
