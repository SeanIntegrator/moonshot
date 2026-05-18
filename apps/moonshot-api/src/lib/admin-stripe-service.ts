import type {
  AdminStripeAccountLinkResponse,
  AdminStripeAccountStatusResponse,
} from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../db.js';
import { mapCafeRow } from './cafe-map.js';
import { ApiHttpError } from './http-errors.js';
import {
  getStripeConnectAccountId,
  mergeStripeIntoPaymentConfig,
} from './payments/cafe-payment-config.js';
import { updateCafePaymentConfig } from './payments/repository.js';
import { getStripeOrNull } from './payments/stripe-client.js';
import {
  createStripeAccountOnboardingLink,
  createStripeExpressConnectedAccount,
  retrieveStripeConnectAccount,
} from './payments/stripe-checkout.js';

type CafeRow = Parameters<typeof mapCafeRow>[0];

async function loadCafeRow(cafeId: string): Promise<ReturnType<typeof mapCafeRow>> {
  const current = await pool.query(
    `SELECT
      id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
      features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email
    FROM cafes WHERE id = $1`,
    [cafeId],
  );
  if (current.rows.length === 0) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  return mapCafeRow(current.rows[0] as CafeRow);
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

function requireStripeForRead(): void {
  if (!getStripeOrNull()) {
    throw new ApiHttpError(503, ApiErrorCode.CONFIG, 'Stripe is not configured (STRIPE_API_KEY)');
  }
}

export async function createAdminStripeOnboardingLink(cafeId: string): Promise<AdminStripeAccountLinkResponse> {
  const { refreshUrl, returnUrl } = requireStripeConnectUrls();

  const cafe = await loadCafeRow(cafeId);
  let accountId = getStripeConnectAccountId(cafe.paymentConfig);
  if (!accountId) {
    const created = await createStripeExpressConnectedAccount();
    accountId = created.accountId;
    const next = mergeStripeIntoPaymentConfig(cafe.paymentConfig, { accountId });
    await updateCafePaymentConfig({ client: pool, cafeId, paymentConfig: next });
  }
  const link = await createStripeAccountOnboardingLink({
    accountId,
    refreshUrl,
    returnUrl,
  });
  return { url: link.url, accountId };
}

export async function syncAdminStripeAccountStatus(cafeId: string): Promise<AdminStripeAccountStatusResponse> {
  requireStripeForRead();

  const cafe = await loadCafeRow(cafeId);
  const accountId = getStripeConnectAccountId(cafe.paymentConfig);
  if (!accountId) {
    return {
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
  return {
    accountId,
    ...live,
  };
}
