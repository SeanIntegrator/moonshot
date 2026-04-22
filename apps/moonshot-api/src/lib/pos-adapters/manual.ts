import type { NormalisedMenu } from '@moonshot/types';
import type { PosAdapter, WebhookRequestLike } from '@moonshot/types';
import { pool } from '../../db.js';
import { mapMenuItemRow } from '../menu-map.js';

const IGNORE_CAFE = '00000000-0000-0000-0000-000000000000';

export const manualPosAdapter: PosAdapter = {
  async fetchMenu(cafeId: string): Promise<NormalisedMenu> {
    const { rows } = await pool.query(
      `SELECT
        id, pos_item_id, name, description, price_minor, currency, category, subcategory,
        image_url, emoji, is_available, tags, modifier_groups
      FROM menu_items
      WHERE cafe_id = $1 AND is_available = TRUE
      ORDER BY sort_order ASC, name ASC`,
      [cafeId],
    );

    const items = rows.map((r) => mapMenuItemRow(r as Parameters<typeof mapMenuItemRow>[0]));

    return {
      cafeId,
      items,
      fetchedAt: new Date().toISOString(),
    };
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
