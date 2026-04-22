/**
 * Stripe (and future providers) — checkout + webhook shapes.
 */

import type { IsoDateTime } from './order.js';
import type { NormalisedOrderItem } from './order.js';

export type PaymentSessionType = 'initial' | 'incremental' | string;

export interface PaymentSession {
  id: string;
  orderId: string;
  cafeId: string;
  provider: 'stripe';
  sessionId: string;
  paymentIntentId: string | null;
  amountMinor: number;
  currency: string;
  type: PaymentSessionType;
  createdAt: IsoDateTime;
}

/** Stripe PaymentIntent fields commonly needed by the API layer */
export interface PaymentIntent {
  id: string;
  status: string;
  amountMinor: number;
  currency: string;
}

export interface CheckoutLineItem {
  /** Internal menu line reference or catalog id depending on adapter phase */
  menuItemId?: string | null;
  posVariationId?: string | null;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  modifiers: NormalisedOrderItem['modifiers'];
  allergens?: string[];
  notes?: string | null;
}

export interface CheckoutRequest {
  cafeId: string;
  userId: string;
  orderId?: string;
  /** When merging onto an existing paid order */
  editToken?: string;
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
}

export interface RefundRequest {
  cafeId: string;
  orderId: string;
  paymentIntentId: string;
  amountMinor?: number;
  reason?: string | null;
}
