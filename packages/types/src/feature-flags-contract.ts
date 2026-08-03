/**
 * Keys into `cafes.features` JSONB — pure contract for Café / API types.
 * `FeatureFlagKeys` const also lives here so `FeatureFlagKey` cannot drift;
 * `@moonshot/domain` re-exports it for app convenience.
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
