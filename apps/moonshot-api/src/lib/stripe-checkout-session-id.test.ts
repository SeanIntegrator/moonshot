import { describe, expect, it } from 'vitest';
import {
  isStripeCheckoutSessionIdWellFormed,
  STRIPE_CHECKOUT_SESSION_ID_RE,
} from './stripe-checkout-session-id.js';

describe('isStripeCheckoutSessionIdWellFormed', () => {
  it('accepts typical Stripe Checkout session ids', () => {
    expect(isStripeCheckoutSessionIdWellFormed('cs_test_a1B2c3')).toBe(true);
    expect(isStripeCheckoutSessionIdWellFormed('cs_live_ABC012xyz')).toBe(true);
    expect(STRIPE_CHECKOUT_SESSION_ID_RE.test('cs_live_ABC012xyz')).toBe(true);
  });

  it('rejects missing cs_ prefix, slashes, and overlong strings', () => {
    expect(isStripeCheckoutSessionIdWellFormed('pi_not_checkout')).toBe(false);
    expect(isStripeCheckoutSessionIdWellFormed('cs_/evil')).toBe(false);
    expect(isStripeCheckoutSessionIdWellFormed(`cs_${'x'.repeat(300)}`)).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isStripeCheckoutSessionIdWellFormed('')).toBe(false);
  });
});
