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

// --- KDS room: client → server ---

export type KdsClientToServerEvent = {
  type: 'kds:subscribe';
  cafeId: string;
  /** Device/session secret issued by moonshotApi */
  token: string;
};

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
  cafeId: string;
  token: string;
};

/** Union of every server-emitted payload (discriminate on `type`) */
export type MoonshotServerToClientEvent = KdsServerToClientEvent | CustomerServerToClientEvent;

/** Union of every client-emitted payload */
export type MoonshotClientToServerEvent = KdsClientToServerEvent | CustomerClientToServerEvent;
