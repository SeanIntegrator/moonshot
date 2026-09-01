import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../http-errors.js';

/** Café-facing copy when the platform cannot create connected accounts yet. */
export const STRIPE_CONNECT_UNAVAILABLE_MESSAGE =
  "Stripe isn't ready to connect new accounts yet. Skip for now and collect payment in store.";

export const STRIPE_CONNECT_SETUP_FAILED_MESSAGE =
  'Could not start Stripe setup. Try again, or skip and collect payment in store.';

function isStripePlatformProfileError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /platform-profile|responsibilities of managing losses/i.test(message);
}

/** Map Stripe SDK failures to seller-safe HTTP errors. Logs the raw Stripe message. */
export function mapStripeOnboardingError(err: unknown): ApiHttpError {
  if (err instanceof ApiHttpError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const stripeLike = err as { type?: string; code?: string };
  const kind = isStripePlatformProfileError(err) ? 'platform_profile' : 'stripe_error';

  console.error('[stripe-connect] onboarding_failed', {
    kind,
    type: stripeLike.type,
    code: stripeLike.code,
    message,
  });

  if (kind === 'platform_profile') {
    return new ApiHttpError(503, ApiErrorCode.CONFIG, STRIPE_CONNECT_UNAVAILABLE_MESSAGE);
  }

  return new ApiHttpError(502, ApiErrorCode.INTERNAL, STRIPE_CONNECT_SETUP_FAILED_MESSAGE);
}
