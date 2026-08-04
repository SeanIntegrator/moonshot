/**
 * Socket.io event contracts — server ↔ client payloads per namespace.
 */

import type { IsoDateTime, NormalisedOrder, OrderStatus } from './order.js';

// --- KDS room: server → client ---

export type KdsServerToClientEvent =
  | { type: 'kds:order:new'; order: NormalisedOrder }
  | {
      type: 'kds:order:updated';
      order: NormalisedOrder;
      mergeFlag?: boolean;
      newItemIds?: string[];
    }
  | { type: 'kds:order:removed'; orderId: string }
  | {
      type: 'kds:eta:updated';
      updates: Array<{ orderId: string; pickupTime: IsoDateTime }>;
    };

/** @alias KdsServerToClientEvent — plan/doc shorthand */
export type KdsSocketEvent = KdsServerToClientEvent;

/**
 * KDS Socket.io clients authenticate via namespace `/kds` handshake only: `io(url, { auth: { token } })`.
 * There is no separate client→server socket event for auth.
 */
export interface KdsSocketHandshakeAuth {
  token: string;
}

// --- Admin room: server → client ---

export type AdminCatalogSyncSource = 'webhook' | 'manual' | 'cron';

export type AdminServerToClientEvent = {
  type: 'admin:menu:synced';
  cafeId: string;
  syncedAt: IsoDateTime;
  upsertedItems: number;
  softDeletedItems: number;
  source: AdminCatalogSyncSource;
};

export interface AdminSocketHandshakeAuth {
  token: string;
}

// --- Customer room: server → client ---

/** Stamp-card snapshot carried on order-complete when loyalty apply succeeded. */
export type CustomerOrderCompletedLoyalty = {
  stamps: number;
  stampsPerReward: number;
  rewardsAvailable: number;
};

export type CustomerServerToClientEvent =
  | {
      type: 'customerOrderCompleted';
      orderId: string;
      cafeId: string;
      completedAt: IsoDateTime;
      userId: string | null;
      /** Present when ledger apply finished before emit; omit on failure/timeout. */
      loyalty?: CustomerOrderCompletedLoyalty;
    }
  | {
      type: 'customerOrderStatusUpdated';
      orderId: string;
      cafeId: string;
      status: OrderStatus;
    }
  | {
      type: 'customerEtaUpdated';
      updates: Array<{ orderId: string; pickupTime: IsoDateTime }>;
    }
  | {
      type: 'customerReviewEligible';
      orderId: string;
      cafeId: string;
      googlePlaceId: string | null;
    }
  | {
      type: 'customerMenuUpdated';
      cafeId: string;
      syncedAt: IsoDateTime;
    };

// --- Customer room: client → server ---

export type CustomerClientToServerEvent =
  | {
      type: 'customer:subscribe';
      orderId: string;
      /** Guest: `trackingToken` from `POST /orders`. Signed-in: Google session JWT from `POST /auth/google`. */
      authToken: string;
    }
  | {
      type: 'customer:unsubscribe';
      orderId: string;
    }
  | {
      type: 'customer:subscribeCafe';
      cafeSlug: string;
    };

/** Union of every server-emitted payload (discriminate on `type`) */
export type MoonshotServerToClientEvent =
  | KdsServerToClientEvent
  | CustomerServerToClientEvent
  | AdminServerToClientEvent;

/** Client→server payloads customers may emit (KDS/Admin use handshake only). */
export type MoonshotClientToServerEvent = CustomerClientToServerEvent;
