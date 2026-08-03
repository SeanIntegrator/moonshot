import type { NormalisedMenu } from '@moonshot/types';
import type { PosAdapter, PosCatalog, WebhookRequestLike } from '@moonshot/domain';
import { posSectionsToCafeSections } from '@moonshot/domain';
import { fetchSquareCatalog } from './catalog-fetch.js';
import { normaliseSquareCatalog } from './catalog-normalise.js';
import type { SquareClientEnvironment } from './client.js';
import {
  fetchSquareOrder,
  mapSquareEnvelopeToWebhookEvent,
} from './order-normalise.js';
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
  /** Full POS catalogue from the last fetchMenu call. */
  lastPosCatalog: PosCatalog | null;
};

function posCatalogToNormalisedMenu(catalog: PosCatalog): NormalisedMenu {
  return {
    cafeId: catalog.cafeId,
    items: catalog.items,
    sections: posSectionsToCafeSections(catalog.cafeId, catalog.sections),
    fetchedAt: catalog.fetchedAt,
  };
}

/**
 * Square POS adapter — Catalog fetch + order webhook parse/verify.
 */
export function createSquarePosAdapter(config: SquareAdapterConfig): SquarePosAdapter {
  let lastPosCatalog: PosCatalog | null = null;

  return {
    get lastPosCatalog() {
      return lastPosCatalog;
    },

    async fetchMenu(cafeId: string): Promise<NormalisedMenu> {
      const snapshot = await fetchSquareCatalog({
        accessToken: config.accessToken,
        environment: config.environment,
      });
      lastPosCatalog = normaliseSquareCatalog(cafeId || config.cafeId, snapshot);
      return posCatalogToNormalisedMenu(lastPosCatalog);
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
