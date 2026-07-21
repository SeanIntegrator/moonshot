import { Router, type Request, type Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../db.js';
import { findCafeById, findCafesByStripeAccountId } from '../lib/cafes-repository.js';
import { mergeStripeIntoPaymentConfig } from '../lib/payments/cafe-payment-config.js';
import {
  claimStripeWebhookForProcessing,
  completeStripeWebhookProcessing,
  failStripeWebhookProcessing,
  updateCafePaymentConfig,
} from '../lib/payments/repository.js';
import { getStripeOrNull } from '../lib/payments/stripe-client.js';
import { confirmOrderPaidFromStripeCheckout } from '../lib/orders/order-checkout.js';
import { recomputePickupEtasForCafe } from '../lib/pickup-eta.js';
import { emitKdsServerToClient } from '../realtime/kds-events.js';

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
        const redeemRewardId = session.metadata?.moonshot_redeem_reward_id ?? null;
        if (!orderId || !cafeId || session.amount_total == null) break;

        const currency = (session.currency ?? 'gbp').toUpperCase();
        const pi =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent && typeof session.payment_intent === 'object'
              ? (session.payment_intent as Stripe.PaymentIntent).id
              : null;

        const orderBefore = await pool.query<{ user_id: string | null }>(
          `SELECT user_id FROM orders WHERE id = $1 AND cafe_id = $2`,
          [orderId, cafeId],
        );
        const userId = orderBefore.rows[0]?.user_id ?? null;

        const order = await confirmOrderPaidFromStripeCheckout({
          orderId,
          cafeId,
          stripeSessionId: session.id,
          paymentIntentId: pi,
          amountMinor: session.amount_total,
          currency,
          redeemRewardId,
          userId,
        });
        if (!order) {
          throw new Error('confirmOrderPaidFromStripeCheckout returned null (order mismatch or not pending)');
        }

        emitKdsServerToClient(cafeId, { type: 'kds:order:new', order });

        const cafe = await findCafeById(cafeId);
        if (cafe) {
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
        const matches = await findCafesByStripeAccountId(accountId);
        for (const { id, paymentConfig } of matches) {
          const next = mergeStripeIntoPaymentConfig(paymentConfig, {
            accountId,
            chargesEnabled: Boolean(account.charges_enabled),
            detailsSubmitted: Boolean(account.details_submitted),
            payoutsEnabled: Boolean(account.payouts_enabled),
          });
          await updateCafePaymentConfig({ client: pool, cafeId: id, paymentConfig: next });
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
