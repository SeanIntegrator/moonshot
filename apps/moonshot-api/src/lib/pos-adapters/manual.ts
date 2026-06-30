import type { NormalisedMenu } from '@moonshot/types';
import type { PosAdapter, WebhookRequestLike } from '@moonshot/types';
import { pool } from '../../db.js';
import { fetchMenuForCafe } from '../menu-fetch.js';

const IGNORE_CAFE = '00000000-0000-0000-0000-000000000000';

export const manualPosAdapter: PosAdapter = {
  async fetchMenu(cafeId: string): Promise<NormalisedMenu> {
    return fetchMenuForCafe(pool, cafeId, true);
  },

  async parseWebhook(_req: WebhookRequestLike) {
    return {
      kind: 'ignored' as const,
      cafeId: IGNORE_CAFE,
      reason: 'manual adapter has no webhooks',
    };
  },

  verifyWebhookSignature(_req: WebhookRequestLike): boolean {
    return false;
  },
};
