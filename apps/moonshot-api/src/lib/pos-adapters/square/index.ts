import type { NormalisedMenu, PosAdapter, WebhookRequestLike } from '@moonshot/types';
import { fetchSquareCatalog } from './catalog-fetch.js';
import { normaliseSquareCatalog } from './catalog-normalise.js';
import type { SquareClientEnvironment } from './client.js';
import type { ModifierRoleHint } from './role-hints.js';

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
 * Square POS adapter — Catalog fetch + normalise.
 * Webhook methods are stubs until the M3 webhook follow-up.
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

    // Order webhooks — follow-up (roadmap M3 line 46).
    async parseWebhook(_req: WebhookRequestLike) {
      return {
        kind: 'ignored' as const,
        cafeId: config.cafeId,
        reason: 'Square order webhooks not wired yet',
      };
    },

    verifyWebhookSignature(_req: WebhookRequestLike): boolean {
      return false;
    },
  };
}
