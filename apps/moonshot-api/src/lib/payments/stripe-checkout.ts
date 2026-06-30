import Stripe from 'stripe';
import type { ResolvedOrderLine } from '../order-modifiers.js';
import { requireStripe } from './stripe-client.js';

function buildLineItems(
  resolvedLines: ResolvedOrderLine[],
  currency: string,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const c = currency.toLowerCase();
  return resolvedLines.map((l) => {
    const modLabel =
      l.modifiers.length > 0 ? ` — ${l.modifiers.map((m) => m.optionName).join(', ')}` : '';
    return {
      quantity: l.quantity,
      price_data: {
        currency: c,
        unit_amount: l.unitPriceMinor,
        product_data: {
          name: `${l.itemName}${modLabel}`,
        },
      },
    };
  });
}

export async function createStripeCheckoutSessionDirectCharge(params: {
  connectedAccountId: string;
  resolvedLines: ResolvedOrderLine[];
  currency: string;
  orderId: string;
  cafeId: string;
  successUrl: string;
  cancelUrl: string;
  discountMinor?: number;
  redeemRewardId?: string | null;
}): Promise<{ sessionId: string; url: string | null; paymentIntentId: string | null }> {
  const stripe = requireStripe();
  const {
    connectedAccountId,
    resolvedLines,
    currency,
    orderId,
    cafeId,
    successUrl,
    cancelUrl,
    discountMinor = 0,
    redeemRewardId,
  } = params;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: buildLineItems(resolvedLines, currency),
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      moonshot_order_id: orderId,
      moonshot_cafe_id: cafeId,
      ...(redeemRewardId ? { moonshot_redeem_reward_id: redeemRewardId } : {}),
    },
  };

  if (discountMinor > 0) {
    const coupon = await stripe.coupons.create(
      {
        amount_off: discountMinor,
        currency: currency.toLowerCase(),
        duration: 'once',
        name: 'Loyalty reward',
      },
      { stripeAccount: connectedAccountId },
    );
    sessionParams.discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create(sessionParams, {
    stripeAccount: connectedAccountId,
  });

  const pi =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent && typeof session.payment_intent === 'object'
        ? (session.payment_intent as Stripe.PaymentIntent).id
        : null;

  return {
    sessionId: session.id,
    url: session.url ?? null,
    paymentIntentId: pi,
  };
}

export async function retrieveStripeCheckoutSession(params: {
  sessionId: string;
  connectedAccountId: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = requireStripe();
  return stripe.checkout.sessions.retrieve(params.sessionId, {
    stripeAccount: params.connectedAccountId,
  });
}

export async function createStripeExpressConnectedAccount(): Promise<{ accountId: string }> {
  const stripe = requireStripe();
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return { accountId: account.id };
}

export async function createStripeAccountOnboardingLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = requireStripe();
  const link = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: 'account_onboarding',
  });
  return { url: link.url };
}

export async function retrieveStripeConnectAccount(accountId: string): Promise<{
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
}> {
  const stripe = requireStripe();
  const acct = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: Boolean(acct.charges_enabled),
    detailsSubmitted: Boolean(acct.details_submitted),
    payoutsEnabled: Boolean(acct.payouts_enabled),
  };
}
