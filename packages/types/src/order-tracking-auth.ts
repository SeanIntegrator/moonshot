/**
 * JWT issued for guest order tracking on Socket.io `/customer` (short-lived, order-scoped).
 * Distinct from {@link JwtClaims} (Google session) and {@link KdsJwtClaims}.
 */

export const TRACK_ORDER_JWT_PURPOSE = 'track_order' as const;

export interface TrackOrderJwtClaims {
  purpose: typeof TRACK_ORDER_JWT_PURPOSE;
  orderId: string;
  cafeId: string;
  iat?: number;
  exp?: number;
}
