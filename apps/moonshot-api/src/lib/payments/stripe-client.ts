import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

/**
 * Pin the API version so behaviour is identical across environments and
 * doesn't change silently when the account's dashboard default moves. Bump
 * deliberately when adopting new features. See docs/architecture for upgrade
 * guidance and the Stripe upgrade-stripe skill.
 */
const STRIPE_API_VERSION = '2026-04-22.dahlia' as Stripe.LatestApiVersion;

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
