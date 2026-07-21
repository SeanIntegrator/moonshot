/**
 * Stripe (and future providers) — checkout + webhook shapes.
 */

import type { IsoDateTime } from './order.js';

export type PaymentSessionType = 'initial' | 'incremental' | string;

export type PaymentProviderId = 'stripe' | string;

export interface PaymentSession {
  id: string;
  orderId: string;
  cafeId: string;
  provider: PaymentProviderId;
  sessionId: string;
  paymentIntentId: string | null;
  amountMinor: number;
  currency: string;
  type: PaymentSessionType;
  createdAt: IsoDateTime;
}

/** Provider-agnostic checkout session result */
export interface CheckoutSessionResult {
  provider: PaymentProviderId;
  sessionId: string;
  checkoutUrl: string;
  paymentIntentId: string | null;
  amountMinor: number;
  currency: string;
}

/** Stripe Connect onboarding link for admin */
export interface AdminStripeAccountLinkResponse {
  url: string;
  accountId: string;
}

export interface AdminStripeAccountStatusResponse {
  /** False when `STRIPE_API_KEY` is not set on the API — pay-in-store still works. */
  configured: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
}
