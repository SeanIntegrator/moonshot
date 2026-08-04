import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

/**
 * Pin the API version so behaviour is identical across environments and
 * doesn't change silently when the account's dashboard default moves. Bump
 * deliberately with the stripe package (types and HTTP header stay aligned).
 * Webhook endpoints must be pinned to the same version in the Stripe Dashboard
 * — payload shape follows the endpoint config, not this client pin.
 * See docs/architecture/dependency-upgrades.md.
 */
const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2026-07-29.dahlia';

export function getStripeOrNull(): Stripe | null {
  const key = process.env.STRIPE_API_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
      appInfo: {
        name: 'moonshot-api',
        url: 'https://github.com/SeanIntegrator/moonshot',
      },
    });
  }
  return stripeSingleton;
}

export function requireStripe(): Stripe {
  const s = getStripeOrNull();
  if (!s) {
    throw new Error('STRIPE_API_KEY is not configured');
  }
  return s;
}
