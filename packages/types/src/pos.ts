/**
 * POS adapter contracts — implementations live in moonshotApi; types are shared.
 */

import type { NormalisedMenu } from './menu.js';
import type { NormalisedOrder } from './order.js';

/** Reserved for Phase 7 WhatsApp ingress — not a classic POS API */
export const POS_PROVIDERS = {
  square: 'square',
  epos_now: 'epos_now',
  sumup: 'sumup',
  lightspeed: 'lightspeed',
  manual: 'manual',
  whatsapp_n8n: 'whatsapp_n8n',
} as const;

export type PosProvider = (typeof POS_PROVIDERS)[keyof typeof POS_PROVIDERS];

/**
 * Minimal request surface for webhook signature verification + parsing
 * (avoids coupling this package to Express types).
 */
export interface WebhookRequestLike {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Uint8Array | string;
  body?: unknown;
}

export interface PosOrderResult {
  posOrderId: string;
  status: string;
  raw?: unknown;
}

export type NormalisedWebhookEvent =
  | {
      kind: 'order_open_or_updated';
      cafeId: string;
      posOrderId: string;
      /** Adapter may attach a partial order; service completes normalisation */
      snapshot?: Partial<NormalisedOrder>;
    }
  | {
      kind: 'order_removed';
      cafeId: string;
      posOrderId: string;
    }
  | {
      kind: 'ignored';
      cafeId: string;
      reason: string;
    };

export interface PosAdapter {
  fetchMenu(cafeId: string): Promise<NormalisedMenu>;
  createOrder?(order: NormalisedOrder): Promise<PosOrderResult>;
  getOpenOrders?(locationKey: string): Promise<NormalisedOrder[]>;
  completeOrder?(posOrderId: string): Promise<void>;
  parseWebhook(req: WebhookRequestLike): Promise<NormalisedWebhookEvent | null>;
  verifyWebhookSignature(req: WebhookRequestLike): boolean;
}
