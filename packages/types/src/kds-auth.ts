/**
 * KDS HTTP login and order endpoints — shared between moonshotApi and moonshotKDS.
 */

import type { NormalisedOrder } from './order.js';
import type { KdsConfig } from './cafe.js';

/** JWT payload for KDS sessions (distinct from Google customer JWT). */
export interface KdsJwtClaims {
  /** Subject — same as kdsUserId */
  sub: string;
  kdsUserId: string;
  cafeId: string;
  cafeSlug: string;
  purpose: 'kds';
  iat?: number;
  exp?: number;
}

export interface KdsLoginRequest {
  cafeSlug: string;
  username: string;
  password: string;
}

export interface KdsLoginResponse {
  token: string;
  cafe: { id: string; slug: string; name: string };
  kdsUser: { id: string; username: string; displayName: string | null };
}

export interface KdsOrdersResponse {
  orders: NormalisedOrder[];
}

export interface KdsCompleteOrderResponse {
  order: NormalisedOrder;
}

/** Same shape as complete — recalled order is back on the open board as `confirmed`. */
export interface KdsRecallLastOrderResponse {
  order: NormalisedOrder;
}

export interface KdsConfigResponse {
  kdsConfig: KdsConfig;
}

export interface KdsAdvanceStatusRequest {
  status: 'preparing' | 'ready';
}

export interface KdsAdvanceStatusResponse {
  order: NormalisedOrder;
}

export interface KdsStretchEtaRequest {
  /** ISO pickup time the barista set */
  pickupTime: string;
}

export interface KdsStretchEtaResponse {
  order: NormalisedOrder;
}
