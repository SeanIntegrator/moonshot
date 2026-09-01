import { Router, type Request, type Response } from 'express';
import { POS_PROVIDERS } from '@moonshot/domain';
import { pool } from '../db.js';
import {
  fetchSquareOrder,
  mapSquareEnvelopeToWebhookEvent,
} from '../lib/pos-adapters/square/order-normalise.js';
import { enqueueCatalogSync } from '../lib/pos-adapters/square/catalog-sync.js';
import { ensureFreshSquareAccessToken } from '../lib/pos-adapters/square/token-refresh.js';
import {
  parseSquareWebhookEnvelope,
  rawBodyToString,
  SQUARE_CATALOG_WEBHOOK_TYPE,
  SQUARE_OAUTH_REVOKED_WEBHOOK_TYPE,
  verifySquareWebhookRequest,
} from '../lib/pos-adapters/square/webhook.js';
import {
  findCafeIdByMerchantId,
  findCafeIdByMerchantIdAnyStatus,
  markNeedsReauth,
  markRevoked,
} from '../lib/pos-connections-repository.js';
import { persistPosOrderEvent } from '../lib/orders/pos-order-ingress.js';
import {
  claimWebhookForProcessing,
  completeWebhookProcessing,
  failWebhookProcessing,
} from '../lib/webhooks/claim.js';
import { isPermanentSquareAuthFailure } from '../lib/pos-adapters/square/auth-errors.js';

const PROVIDER = 'square';

/**
 * App-level Square webhooks: verify HMAC → claim event_id → merchant_id → café →
 * catalog debounce sync and/or order retrieve + persist + KDS emit.
 */
export async function handleSquareWebhook(req: Request, res: Response): Promise<void> {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  if (!signatureKey) {
    void res.status(503).json({ ok: false, error: 'Square webhook not configured' });
    return;
  }

  const rawBody =
    req.body instanceof Buffer
      ? req.body.toString('utf8')
      : rawBodyToString({ headers: req.headers, body: req.body });

  const verified = verifySquareWebhookRequest({
    headers: req.headers,
    rawBody,
  });
  if (!verified) {
    void res.status(403).send('Invalid Square webhook signature');
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    void res.status(400).send('Invalid JSON');
    return;
  }

  const envelope = parseSquareWebhookEnvelope(body);
  if (!envelope) {
    void res.status(400).send('Missing event_id or merchant_id');
    return;
  }

  const isRevokeEvent = envelope.type === SQUARE_OAUTH_REVOKED_WEBHOOK_TYPE;
  const cafeId = isRevokeEvent
    ? await findCafeIdByMerchantIdAnyStatus(pool, POS_PROVIDERS.square, envelope.merchantId)
    : await findCafeIdByMerchantId(pool, POS_PROVIDERS.square, envelope.merchantId);

  const claim = await claimWebhookForProcessing({
    client: pool,
    provider: PROVIDER,
    eventId: envelope.eventId,
    cafeId,
  });

  if (claim.kind === 'duplicate_processed') {
    void res.json({ received: true, duplicate: true });
    return;
  }
  if (claim.kind === 'skip_inflight') {
    void res.json({ received: true });
    return;
  }

  try {
    if (!cafeId) {
      console.info('[square-webhook] ignored_unknown_merchant', {
        merchantId: envelope.merchantId,
        type: envelope.type,
        eventId: envelope.eventId,
      });
      await completeWebhookProcessing({
        client: pool,
        provider: PROVIDER,
        eventId: envelope.eventId,
      });
      void res.json({ received: true, ignored: true, reason: 'unknown_merchant' });
      return;
    }

    if (envelope.type === SQUARE_OAUTH_REVOKED_WEBHOOK_TYPE) {
      await markRevoked(pool, cafeId, POS_PROVIDERS.square);
      console.info('[square-webhook] oauth_revoked', {
        cafeId,
        merchantId: envelope.merchantId,
        eventId: envelope.eventId,
      });
      await completeWebhookProcessing({
        client: pool,
        provider: PROVIDER,
        eventId: envelope.eventId,
      });
      void res.json({ received: true, kind: 'oauth_revoked' });
      return;
    }

    if (envelope.type === SQUARE_CATALOG_WEBHOOK_TYPE) {
      enqueueCatalogSync(cafeId, { source: 'webhook' });
      await completeWebhookProcessing({
        client: pool,
        provider: PROVIDER,
        eventId: envelope.eventId,
      });
      void res.json({ received: true, kind: 'catalog_sync_enqueued' });
      return;
    }

    const conn = await ensureFreshSquareAccessToken(pool, cafeId);
    if (!conn) {
      console.error('[square-webhook] missing_active_connection', {
        cafeId,
        merchantId: envelope.merchantId,
      });
      await completeWebhookProcessing({
        client: pool,
        provider: PROVIDER,
        eventId: envelope.eventId,
      });
      void res.json({ received: true, ignored: true, reason: 'no_active_connection' });
      return;
    }

    let order: Record<string, unknown> | null = null;
    if (envelope.orderId) {
      try {
        order = await fetchSquareOrder({
          accessToken: conn.accessToken,
          orderId: envelope.orderId,
        });
      } catch (err) {
        console.error('[square-webhook] retrieve_order_failed', {
          cafeId,
          orderId: envelope.orderId,
          message: err instanceof Error ? err.message : String(err),
        });
        if (isPermanentSquareAuthFailure(err)) {
          await markNeedsReauth(pool, cafeId, POS_PROVIDERS.square);
        }
      }
    }

    const event = mapSquareEnvelopeToWebhookEvent({ cafeId, envelope, order });
    await persistPosOrderEvent(event);

    await completeWebhookProcessing({
      client: pool,
      provider: PROVIDER,
      eventId: envelope.eventId,
    });
    void res.json({ received: true, kind: event.kind });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failWebhookProcessing({
      client: pool,
      provider: PROVIDER,
      eventId: envelope.eventId,
      message,
    });
    console.error('[square-webhook] handler_failed', {
      eventId: envelope.eventId,
      message,
    });
    void res.status(500).json({ ok: false, error: 'Webhook handler failed' });
  }
}

export const squareWebhookRouter: Router = Router();
squareWebhookRouter.post('/', (req, res) => {
  void handleSquareWebhook(req, res);
});
