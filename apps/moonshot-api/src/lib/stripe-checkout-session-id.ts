/** Stripe documents Checkout Session ids as `cs_…`; observed ids include underscores (e.g. `cs_test_…`). */
export const STRIPE_CHECKOUT_SESSION_ID_RE = /^cs_[a-zA-Z0-9_]+$/;

export function isStripeCheckoutSessionIdWellFormed(sessionId: string): boolean {
  return Boolean(sessionId) && sessionId.length <= 256 && STRIPE_CHECKOUT_SESSION_ID_RE.test(sessionId);
}
