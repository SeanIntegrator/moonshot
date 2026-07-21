import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../http-errors.js';

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

/**
 * Stripe return URLs for a café — built from platform `ORDER_AHEAD_BASE_URL` + slug.
 * Café owners never configure these; ops sets one base URL on the API service.
 */
export function checkoutUrlsForCafe(cafeSlug: string): { successUrl: string; cancelUrl: string } {
  const slug = cafeSlug.trim();
  if (!slug) {
    throw new ApiHttpError(500, ApiErrorCode.CONFIG, 'Café slug is required for Stripe checkout URLs');
  }

  const base = process.env.ORDER_AHEAD_BASE_URL?.trim();
  if (base) {
    const origin = normalizeBaseUrl(base);
    return {
      successUrl: `${origin}/${encodeURIComponent(slug)}/checkout/restore?checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/${encodeURIComponent(slug)}/checkout`,
    };
  }

  return checkoutUrlsFromEnvLegacy();
}

/** Single-café fallback when ORDER_AHEAD_BASE_URL is unset — requires manual slug in URL. */
function checkoutUrlsFromEnvLegacy(): { successUrl: string; cancelUrl: string } {
  const success = process.env.ORDER_AHEAD_SUCCESS_URL?.trim();
  const cancel = process.env.ORDER_AHEAD_CANCEL_URL?.trim();
  if (!success || !cancel) {
    throw new ApiHttpError(
      500,
      ApiErrorCode.CONFIG,
      'Set ORDER_AHEAD_BASE_URL on the API (recommended), or ORDER_AHEAD_SUCCESS_URL and ORDER_AHEAD_CANCEL_URL for Stripe checkout',
    );
  }
  const successUrl = success.includes('{CHECKOUT_SESSION_ID}')
    ? success
    : `${normalizeBaseUrl(success)}?checkout_session_id={CHECKOUT_SESSION_ID}`;
  return { successUrl, cancelUrl: cancel };
}
