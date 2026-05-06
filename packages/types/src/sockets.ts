/**
 * Socket.io event contracts — server ↔ client payloads per namespace.
 */

import type { IsoDateTime, NormalisedOrder } from './order.js';

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

/**
 * @deprecated Use {@link KdsSocketHandshakeAuth}; KDS never emits a `kds:subscribe` payload.
 */
export type KdsClientToServerEvent = KdsSocketHandshakeAuth;

// --- Customer room: server → client ---

export type CustomerServerToClientEvent =
  | {
      type: 'customerOrderCompleted';
      orderId: string;
      cafeId: string;
      completedAt: IsoDateTime;
      userId: string | null;
    }
  | {
      type: 'customerEtaUpdated';
      updates: Array<{ orderId: string; pickupTime: IsoDateTime }>;
    };

// --- Customer room: client → server ---

export type CustomerClientToServerEvent = {
  type: 'customer:subscribe';
  orderId: string;
  /** Guest: `trackingToken` from `POST /orders`. Signed-in: Google session JWT from `POST /auth/google`. */
  authToken: string;
};

/** Union of every server-emitted payload (discriminate on `type`) */
export type MoonshotServerToClientEvent = KdsServerToClientEvent | CustomerServerToClientEvent;

/** Client→server payloads customers may emit (KDS uses handshake only). */
export type MoonshotClientToServerEvent = CustomerClientToServerEvent;
