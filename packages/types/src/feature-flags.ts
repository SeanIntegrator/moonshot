/**
 * Keys into `cafes.features` JSONB — use for end-to-end type narrowing.
 * Values are feature-specific objects or `null` when disabled.
 */

export const FeatureFlagKeys = {
  loyalty: 'loyalty',
  events: 'events',
  promotions: 'promotions',
  orderAhead: 'order_ahead',
  reviewNudge: 'review_nudge',
  savedOrders: 'saved_orders',
  whatsappOrdering: 'whatsapp_ordering',
} as const;

export type FeatureFlagKey = (typeof FeatureFlagKeys)[keyof typeof FeatureFlagKeys];
