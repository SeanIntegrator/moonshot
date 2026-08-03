import type {
  AdminStripeAccountLinkResponse,
  AdminStripeAccountStatusResponse,
  CafeFeatures,
} from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../db.js';
import { findCafeById } from './cafes-repository.js';
import type { ResolvedCafe } from './resolved-cafe.js';
import { ApiHttpError } from './http-errors.js';
import {
  getStripeConnectAccountId,
  mergeStripeIntoPaymentConfig,
} from './payments/cafe-payment-config.js';
import { updateCafePaymentConfig } from './payments/repository.js';
import { getStripeOrNull } from './payments/stripe-client.js';
import {
  adminRedirectWithStripeQuery,
  buildStripeConnectCallbackUrl,
  verifyStripeConnectState,
} from './admin-stripe-connect-urls.js';
import {
  createStripeAccountOnboardingLink,
  createStripeExpressConnectedAccount,
  retrieveStripeConnectAccount,
} from './payments/stripe-checkout.js';

async function loadCafeOrThrow(cafeId: string): Promise<ResolvedCafe> {
  const cafe = await findCafeById(cafeId);
  if (!cafe) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  return cafe;
}

/** Stripe Connect onboarding links require Return URLs in env */
function requireStripeConnectUrls(): { refreshUrl: string; returnUrl: string } {
  if (!getStripeOrNull()) {
    throw new ApiHttpError(503, ApiErrorCode.CONFIG, 'Stripe is not configured (STRIPE_API_KEY)');
  }
  const refreshUrl = process.env.STRIPE_CONNECT_REFRESH_URL?.trim();
  const returnUrl = process.env.STRIPE_CONNECT_RETURN_URL?.trim();
  if (!refreshUrl || !returnUrl) {
    throw new ApiHttpError(
      500,
      ApiErrorCode.CONFIG,
      'STRIPE_CONNECT_REFRESH_URL and STRIPE_CONNECT_RETURN_URL must be set',
    );
  }
  return { refreshUrl, returnUrl };
}

export async function createAdminStripeOnboardingLink(cafeId: string): Promise<AdminStripeAccountLinkResponse> {
  const { refreshUrl, returnUrl } = requireStripeConnectUrls();

  const cafe = await loadCafeOrThrow(cafeId);
  let accountId = getStripeConnectAccountId(cafe.paymentConfig);
  if (!accountId) {
    const created = await createStripeExpressConnectedAccount();
    accountId = created.accountId;
    const next = mergeStripeIntoPaymentConfig(cafe.paymentConfig, { accountId });
    await updateCafePaymentConfig({ client: pool, cafeId, paymentConfig: next });
  }
  const link = await createStripeAccountOnboardingLink({
    accountId,
    refreshUrl: buildStripeConnectCallbackUrl(refreshUrl, cafeId),
    returnUrl: buildStripeConnectCallbackUrl(returnUrl, cafeId),
  });
  return { url: link.url, accountId };
}

/** Stripe return_url: sync account flags, then redirect to admin dashboard. */
export async function handleStripeConnectReturn(state: string): Promise<{ redirectUrl: string }> {
  const cafeId = verifyStripeConnectState(state);
  if (!cafeId) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid or missing Stripe Connect state');
  }
  await syncAdminStripeAccountStatus(cafeId);
  return { redirectUrl: adminRedirectWithStripeQuery('return') };
}

/**
 * Stripe refresh_url: Account Link expired — issue a new link and send the user back to Stripe.
 */
export async function handleStripeConnectRefresh(state: string): Promise<{ redirectUrl: string }> {
  const cafeId = verifyStripeConnectState(state);
  if (!cafeId) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid or missing Stripe Connect state');
  }
  const { url } = await createAdminStripeOnboardingLink(cafeId);
  return { redirectUrl: url };
}

/** Self-service cafés start pay-in-store; flip to Stripe checkout once Connect can charge. */
function paymentProviderForStripeReady(features: CafeFeatures): CafeFeatures {
  const oa = features.order_ahead;
  if (!oa || oa.paymentProvider !== 'pay_in_store') return features;
  return {
    ...features,
    order_ahead: { ...oa, paymentProvider: 'stripe' },
  };
}

export async function syncAdminStripeAccountStatus(cafeId: string): Promise<AdminStripeAccountStatusResponse> {
  // Status is polled on every payments UI load — return a soft "not configured" payload
  // instead of 503 so pay-in-store cafés don't hit console network errors.
  if (!getStripeOrNull()) {
    return {
      configured: false,
      accountId: null,
      chargesEnabled: false,
      detailsSubmitted: false,
      payoutsEnabled: false,
    };
  }

  const cafe = await loadCafeOrThrow(cafeId);
  const accountId = getStripeConnectAccountId(cafe.paymentConfig);
  if (!accountId) {
    return {
      configured: true,
      accountId: null,
      chargesEnabled: false,
      detailsSubmitted: false,
      payoutsEnabled: false,
    };
  }
  const live = await retrieveStripeConnectAccount(accountId);
  const next = mergeStripeIntoPaymentConfig(cafe.paymentConfig, {
    accountId,
    ...live,
  });
  await updateCafePaymentConfig({ client: pool, cafeId, paymentConfig: next });

  if (live.chargesEnabled && cafe.features.order_ahead?.paymentProvider === 'pay_in_store') {
    const nextFeatures = paymentProviderForStripeReady(cafe.features);
    await pool.query(`UPDATE cafes SET features = $1::jsonb WHERE id = $2`, [
      JSON.stringify(nextFeatures),
      cafeId,
    ]);
    console.info('[stripe.sync] switched order_ahead.paymentProvider to stripe', { cafeId });
  }

  return {
    configured: true,
    accountId,
    ...live,
  };
}
