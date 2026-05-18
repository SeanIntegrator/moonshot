import { Router, type Request, type Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../db.js';
import { mapCafeRow } from '../lib/cafe-map.js';
import { mergeStripeIntoPaymentConfig } from '../lib/payments/cafe-payment-config.js';
import {
  claimStripeWebhookForProcessing,
  completeStripeWebhookProcessing,
  failStripeWebhookProcessing,
  updateCafePaymentConfig,
} from '../lib/payments/repository.js';
import { getStripeOrNull } from '../lib/payments/stripe-client.js';
import { confirmOrderPaidFromStripeCheckout } from '../lib/orders-repository.js';
import { recomputePickupEtasForCafe } from '../lib/pickup-eta.js';
import { emitKdsServerToClient } from '../realtime/kds-events.js';

type CafeRow = Parameters<typeof mapCafeRow>[0];

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const stripe = getStripeOrNull();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !whSecret) {
    void res.status(503).json({ ok: false, error: 'Stripe webhook not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (typeof sig !== 'string') {
    void res.status(400).send('Missing stripe-signature');
    return;
  }

  let event: Stripe.Event;
  try {
    const raw = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch {
    void res.status(400).send('Invalid Stripe webhook signature');
    return;
  }

  const claim = await claimStripeWebhookForProcessing({
    client: pool,
    eventId: event.id,
    cafeId: null,
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
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== 'paid') break;
        const orderId = session.metadata?.moonshot_order_id;
        const cafeId = session.metadata?.moonshot_cafe_id;
        if (!orderId || !cafeId || session.amount_total == null) break;

        const currency = (session.currency ?? 'gbp').toUpperCase();
        const pi =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent && typeof session.payment_intent === 'object'
              ? (session.payment_intent as Stripe.PaymentIntent).id
              : null;

        const order = await confirmOrderPaidFromStripeCheckout({
          orderId,
          cafeId,
          stripeSessionId: session.id,
          paymentIntentId: pi,
          amountMinor: session.amount_total,
          currency,
        });
        if (!order) {
          throw new Error('confirmOrderPaidFromStripeCheckout returned null (order mismatch or not pending)');
        }

        emitKdsServerToClient(cafeId, { type: 'kds:order:new', order });

        const cafeResult = await pool.query(
          `SELECT
            id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
            features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email
          FROM cafes WHERE id = $1`,
          [cafeId],
        );
        if (cafeResult.rows.length > 0) {
          const cafe = mapCafeRow(cafeResult.rows[0] as CafeRow);
          await recomputePickupEtasForCafe({
            db: pool,
            cafeId,
            kdsConfig: cafe.kdsConfig,
          });
        }
        break;
      }
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const accountId = account.id;
        const cafeResult = await pool.query(
          `SELECT id, payment_config FROM cafes WHERE payment_config->'stripe'->>'accountId' = $1`,
          [accountId],
        );
        for (const row of cafeResult.rows as Array<{ id: string; payment_config: unknown }>) {
          const config =
            row.payment_config && typeof row.payment_config === 'object' && !Array.isArray(row.payment_config)
              ? (row.payment_config as Record<string, unknown>)
              : {};
          const next = mergeStripeIntoPaymentConfig(config, {
            accountId,
            chargesEnabled: Boolean(account.charges_enabled),
            detailsSubmitted: Boolean(account.details_submitted),
            payoutsEnabled: Boolean(account.payouts_enabled),
          });
          await updateCafePaymentConfig({ client: pool, cafeId: row.id, paymentConfig: next });
        }
        break;
      }
      default:
        break;
    }

    await completeStripeWebhookProcessing({ client: pool, eventId: event.id });
    void res.json({ received: true });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Webhook processing failed';
    await failStripeWebhookProcessing({ client: pool, eventId: event.id, message });
    void res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
}

export const stripeWebhookRouter: Router = Router();
stripeWebhookRouter.post('/', (req: Request, res: Response) => {
  void handleStripeWebhook(req, res);
});
