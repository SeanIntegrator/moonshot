import { Router, type Request, type Response } from 'express';
import { POS_PROVIDERS } from '@moonshot/types';
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
  verifySquareWebhookRequest,
} from '../lib/pos-adapters/square/webhook.js';
import { findCafeIdByMerchantId } from '../lib/pos-connections-repository.js';
import { persistPosOrderEvent } from '../lib/orders/pos-order-ingress.js';
import {
  claimWebhookForProcessing,
  completeWebhookProcessing,
  failWebhookProcessing,
} from '../lib/webhooks/claim.js';

const PROVIDER = 'square';

/**
 * App-level Square webhooks: verify HMAC → claim event_id → merchant_id → café →
 * catalog debounce sync and/or order retrieve + persist + KDS emit.
 */
export async function handleSquareWebhook(req: Request, res: Response): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H1',location:'webhooks-square.ts:entry',message:'square webhook hit',data:{hasSigKey:Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim()),notifUrlSet:Boolean(process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim()),bodyIsBuffer:Buffer.isBuffer(req.body),contentType:req.headers['content-type']??null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  if (!signatureKey) {
    // #region agent log
    fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H1',location:'webhooks-square.ts:no-sig-key',message:'reject 503 missing signature key',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H2',location:'webhooks-square.ts:bad-sig',message:'reject 403 bad signature',data:{rawBodyLen:rawBody.length,hasSigHeader:Boolean(req.headers['x-square-hmacsha256-signature'])},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H2',location:'webhooks-square.ts:bad-envelope',message:'reject 400 missing envelope fields',data:{bodyKeys:body&&typeof body==='object'?Object.keys(body as object):[]},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    void res.status(400).send('Missing event_id or merchant_id');
    return;
  }

  const cafeId = await findCafeIdByMerchantId(
    pool,
    POS_PROVIDERS.square,
    envelope.merchantId,
  );

  // #region agent log
  fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H3',location:'webhooks-square.ts:resolved',message:'envelope parsed and merchant looked up',data:{type:envelope.type,eventId:envelope.eventId,merchantId:envelope.merchantId,cafeId,isCatalog:envelope.type===SQUARE_CATALOG_WEBHOOK_TYPE},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const claim = await claimWebhookForProcessing({
    client: pool,
    provider: PROVIDER,
    eventId: envelope.eventId,
    cafeId,
  });

  if (claim.kind === 'duplicate_processed') {
    // #region agent log
    fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H3',location:'webhooks-square.ts:duplicate',message:'skipped duplicate webhook',data:{eventId:envelope.eventId,type:envelope.type},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H3',location:'webhooks-square.ts:unknown-merchant',message:'ignored unknown merchant',data:{merchantId:envelope.merchantId,type:envelope.type},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      await completeWebhookProcessing({
        client: pool,
        provider: PROVIDER,
        eventId: envelope.eventId,
      });
      void res.json({ received: true, ignored: true, reason: 'unknown_merchant' });
      return;
    }

    if (envelope.type === SQUARE_CATALOG_WEBHOOK_TYPE) {
      // #region agent log
      fetch('http://127.0.0.1:7550/ingest/aeac030f-2b8e-426f-a680-6b143f7948fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0012c'},body:JSON.stringify({sessionId:'a0012c',runId:'pre-fix',hypothesisId:'H4',location:'webhooks-square.ts:enqueue-catalog',message:'enqueue catalog sync from webhook',data:{cafeId,eventId:envelope.eventId,debounceMs:45000},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      enqueueCatalogSync(cafeId);
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
