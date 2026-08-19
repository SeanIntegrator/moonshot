import type { AdminStripeAccountStatusResponse } from '@moonshot/types';
import type { ConnectionTone } from '../../primitives/connection-tone.js';

export type StripeActionKind = 'onboard' | 'dashboard';

export type StripeRowView = {
  tone: ConnectionTone;
  statusLabel: string;
  meta: string;
  actionKind: StripeActionKind;
  actionLabel: string;
  needsAttention: boolean;
};

export const STRIPE_UNAVAILABLE_STATUS: AdminStripeAccountStatusResponse = {
  configured: false,
  accountId: null,
  chargesEnabled: false,
  detailsSubmitted: false,
  payoutsEnabled: false,
};

export function isStripeServerUnavailable(message: string): boolean {
  return /not configured|STRIPE_/i.test(message);
}

export function stripeRowView(status: AdminStripeAccountStatusResponse | null): StripeRowView {
  if (!status || !status.configured) {
    return {
      tone: 'stale',
      statusLabel: 'Setup unfinished',
      meta: "Card payments aren't available in this environment yet.",
      actionKind: 'onboard',
      actionLabel: 'Finish setup ↗',
      needsAttention: true,
    };
  }

  if (status.chargesEnabled) {
    return {
      tone: 'healthy',
      statusLabel: 'Connected',
      meta: 'Card payments land in your account the next working day.',
      actionKind: 'dashboard',
      actionLabel: 'Go to Stripe dashboard ↗',
      needsAttention: false,
    };
  }

  return {
    tone: 'stale',
    statusLabel: 'Setup unfinished',
    meta: 'Finish setup to take card payments',
    actionKind: 'onboard',
    actionLabel: 'Finish setup ↗',
    needsAttention: true,
  };
}
