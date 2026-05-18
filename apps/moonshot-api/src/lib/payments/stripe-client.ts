import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

export function getStripeOrNull(): Stripe | null {
  const key = process.env.STRIPE_API_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      typescript: true,
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
