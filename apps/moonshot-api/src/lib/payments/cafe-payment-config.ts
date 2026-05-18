/** Café `payment_config.stripe` — Connect Express account + cached dashboard flags */
export type CafeStripePaymentConfig = {
  accountId?: string;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
};

export function getStripePaymentSection(
  paymentConfig: Record<string, unknown>,
): Record<string, unknown> {
  const stripe = paymentConfig.stripe;
  if (stripe && typeof stripe === 'object' && !Array.isArray(stripe)) {
    return { ...(stripe as Record<string, unknown>) };
  }
  return {};
}

export function mergeStripeIntoPaymentConfig(
  paymentConfig: Record<string, unknown>,
  patch: CafeStripePaymentConfig,
): Record<string, unknown> {
  const next = { ...paymentConfig, stripe: { ...getStripePaymentSection(paymentConfig), ...patch } };
  return next;
}

export function getStripeConnectAccountId(paymentConfig: Record<string, unknown>): string | null {
  const id = getStripePaymentSection(paymentConfig).accountId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function isStripeConnectReady(paymentConfig: Record<string, unknown>): boolean {
  const s = getStripePaymentSection(paymentConfig);
  return s.chargesEnabled === true && typeof s.accountId === 'string' && s.accountId.length > 0;
}
