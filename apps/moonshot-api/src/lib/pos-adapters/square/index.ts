import type { NormalisedMenu, PosAdapter, WebhookRequestLike } from '@moonshot/types';
import { fetchSquareCatalog } from './catalog-fetch.js';
import { normaliseSquareCatalog } from './catalog-normalise.js';
import type { SquareClientEnvironment } from './client.js';
import {
  fetchSquareOrder,
  mapSquareEnvelopeToWebhookEvent,
} from './order-normalise.js';
import type { ModifierRoleHint } from './role-hints.js';
import {
  parseSquareWebhookEnvelope,
  verifySquareWebhookRequest,
} from './webhook.js';

export type SquareAdapterConfig = {
  cafeId: string;
  accessToken: string;
  environment?: SquareClientEnvironment;
  locationId?: string | null;
};

export type SquarePosAdapter = PosAdapter & {
  /** Last normalisation role hints — available after fetchMenu. */
  lastRoleHints: Map<string, ModifierRoleHint>;
  lastGroupsByPosId: ReturnType<typeof normaliseSquareCatalog>['groupsByPosId'];
};

/**
 * Square POS adapter — Catalog fetch + order webhook parse/verify.
 */
export function createSquarePosAdapter(config: SquareAdapterConfig): SquarePosAdapter {
  let lastRoleHints = new Map<string, ModifierRoleHint>();
  let lastGroupsByPosId: SquarePosAdapter['lastGroupsByPosId'] = new Map();

  return {
    get lastRoleHints() {
      return lastRoleHints;
    },
    get lastGroupsByPosId() {
      return lastGroupsByPosId;
    },

    async fetchMenu(cafeId: string): Promise<NormalisedMenu> {
      const snapshot = await fetchSquareCatalog({
        accessToken: config.accessToken,
        environment: config.environment,
      });
      const result = normaliseSquareCatalog(cafeId || config.cafeId, snapshot);
      lastRoleHints = result.roleHints;
      lastGroupsByPosId = result.groupsByPosId;
      return result.menu;
    },

    async parseWebhook(req: WebhookRequestLike) {
      let body: unknown = req.body;
      if (body == null && req.rawBody) {
        const raw =
          typeof req.rawBody === 'string'
            ? req.rawBody
            : Buffer.from(req.rawBody).toString('utf8');
        body = JSON.parse(raw);
      }
      const envelope = parseSquareWebhookEnvelope(body);
      if (!envelope) {
        return {
          kind: 'ignored' as const,
          cafeId: config.cafeId,
          reason: 'invalid_envelope',
        };
      }

      let order: Record<string, unknown> | null = null;
      if (envelope.orderId) {
        try {
          order = await fetchSquareOrder({
            accessToken: config.accessToken,
            orderId: envelope.orderId,
            environment: config.environment,
          });
        } catch {
          order = null;
        }
      }

      return mapSquareEnvelopeToWebhookEvent({
        cafeId: config.cafeId,
        envelope,
        order,
      });
    },

    verifyWebhookSignature(req: WebhookRequestLike): boolean {
      return verifySquareWebhookRequest(req);
    },
  };
}
