import { Router } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import type { MenuCategory, NormalisedModifierGroup } from '@moonshot/types';
import type { PosProvider } from '@moonshot/types';
import { pool } from '../db.js';
import { getPosAdapter } from '../lib/pos-adapters/index.js';
import { fetchMenuForCafe, fetchMenuItemsByIds } from '../lib/menu-fetch.js';
import { normalizeSizes, setMenuItemModifierGroups } from '../lib/menu-modifier-library.js';
import {
  MenuImageValidationError,
  uploadMenuItemThumbnail,
} from '../lib/menu-image-storage.js';
import { requireCafeContext } from '../middleware/cafe-context.js';
import { menuItemImageUpload } from '../middleware/menu-item-image-upload.js';
import { requireMenuMutationAuth } from '../middleware/menu-mutation-auth.js';
import { modifierGroupsRouter } from './modifier-groups.js';

const MENU_CATEGORIES: MenuCategory[] = ['hot_drinks', 'cold_drinks', 'food', 'extras'];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Literal path segments that must not be handled by GET /:segment */
const RESERVED_MENU_SEGMENTS = new Set(['manage']);

function parseModifierGroupIds(body: Record<string, unknown>): string[] | undefined {
  if (!('modifierGroupIds' in body)) return undefined;
  if (!Array.isArray(body.modifierGroupIds)) return [];
  return body.modifierGroupIds.filter((id): id is string => typeof id === 'string' && UUID_RE.test(id));
}

async function loadMergedItem(cafeId: string, itemId: string) {
  const map = await fetchMenuItemsByIds(pool, cafeId, [itemId]);
  return map.get(itemId) ?? null;
}

export const menuRouter: Router = Router();

menuRouter.use(requireCafeContext);
menuRouter.use('/modifier-groups', modifierGroupsRouter);

// Static GET routes before parameterized handlers (Express matches in registration order).
menuRouter.get('/manage', requireMenuMutationAuth, async (req, res) => {
  const menu = await fetchMenuForCafe(pool, req.cafe!.cafeId, false);
  return res.json({ ok: true, data: menu });
});

menuRouter.get('/', async (req, res) => {
  const adapter = getPosAdapter(req.cafe!.posProvider as PosProvider, req.cafe!.posConfig);
  const menu = await adapter.fetchMenu(req.cafe!.cafeId);
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ ok: true, data: menu });
});

menuRouter.post('/', requireMenuMutationAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' ? body.category : '';
  const priceMinor = typeof body.priceMinor === 'number' ? body.priceMinor : Number.NaN;

  if (!name || !MENU_CATEGORIES.includes(category as MenuCategory) || !Number.isFinite(priceMinor)) {
    return res.status(400).json({
      ok: false,
      error: 'name, category (valid MenuCategory), and priceMinor are required',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const description = typeof body.description === 'string' ? body.description : null;
  const currency = typeof body.currency === 'string' ? body.currency : 'GBP';
  const subcategory = typeof body.subcategory === 'string' ? body.subcategory : null;
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : null;
  const emoji = typeof body.emoji === 'string' ? body.emoji : null;
  const posItemId = typeof body.posItemId === 'string' ? body.posItemId : null;
  const tags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
  const modifierGroups = Array.isArray(body.modifierGroups)
    ? (body.modifierGroups as NormalisedModifierGroup[])
    : [];
  const sizes = normalizeSizes(body.sizes);
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;
  const modifierGroupIds = parseModifierGroupIds(body) ?? [];

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO menu_items (
      cafe_id, pos_item_id, name, description, price_minor, currency, category, subcategory,
      image_url, emoji, is_available, tags, modifier_groups, sizes, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $12::jsonb, $13::jsonb, $14)
    RETURNING id`,
    [
      cafeId,
      posItemId,
      name,
      description,
      priceMinor,
      currency,
      category,
      subcategory,
      imageUrl,
      emoji,
      tags,
      JSON.stringify(modifierGroups),
      JSON.stringify(sizes),
      sortOrder,
    ],
  );

  const itemId = rows[0]!.id;
  if (modifierGroupIds.length > 0) {
    await setMenuItemModifierGroups(pool, itemId, modifierGroupIds);
  }

  const item = await loadMergedItem(cafeId, itemId);
  return res.status(201).json({ ok: true, data: item });
});

menuRouter.patch('/:itemId', requireMenuMutationAuth, async (req, res) => {
  const rawId = req.params.itemId;
  const itemId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!itemId || !UUID_RE.test(itemId)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid item id',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const cafeId = req.cafe!.cafeId;
  const body = req.body as Record<string, unknown>;
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const modifierGroupIds = parseModifierGroupIds(body);

  const optionalString = (key: string, col: string) => {
    if (key in body) {
      const v = body[key];
      sets.push(`${col} = $${i++}`);
      values.push(typeof v === 'string' ? v : v === null ? null : String(v));
    }
  };

  optionalString('name', 'name');
  optionalString('description', 'description');
  optionalString('subcategory', 'subcategory');
  optionalString('imageUrl', 'image_url');
  optionalString('emoji', 'emoji');
  optionalString('currency', 'currency');
  optionalString('posItemId', 'pos_item_id');

  if ('priceMinor' in body && typeof body.priceMinor === 'number') {
    sets.push(`price_minor = $${i++}`);
    values.push(body.priceMinor);
  }
  if ('category' in body && typeof body.category === 'string') {
    if (!MENU_CATEGORIES.includes(body.category as MenuCategory)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid category',
        code: ApiErrorCode.VALIDATION,
      });
    }
    sets.push(`category = $${i++}`);
    values.push(body.category);
  }
  if ('isAvailable' in body && typeof body.isAvailable === 'boolean') {
    sets.push(`is_available = $${i++}`);
    values.push(body.isAvailable);
  }
  if ('tags' in body && Array.isArray(body.tags)) {
    sets.push(`tags = $${i++}`);
    values.push(body.tags);
  }
  if ('modifierGroups' in body && Array.isArray(body.modifierGroups)) {
    sets.push(`modifier_groups = $${i++}::jsonb`);
    values.push(JSON.stringify(body.modifierGroups));
  }
  if ('sizes' in body) {
    sets.push(`sizes = $${i++}::jsonb`);
    values.push(JSON.stringify(normalizeSizes(body.sizes)));
  }
  if ('sortOrder' in body && typeof body.sortOrder === 'number') {
    sets.push(`sort_order = $${i++}`);
    values.push(body.sortOrder);
  }

  if (sets.length === 0 && modifierGroupIds === undefined) {
    return res.status(400).json({
      ok: false,
      error: 'No fields to update',
      code: ApiErrorCode.VALIDATION,
    });
  }

  if (sets.length > 0) {
    values.push(itemId, cafeId);
    const { rowCount } = await pool.query(
      `UPDATE menu_items SET ${sets.join(', ')}
       WHERE id = $${i++} AND cafe_id = $${i++}`,
      values,
    );
    if (rowCount === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Menu item not found',
        code: ApiErrorCode.NOT_FOUND,
      });
    }
  } else {
    const exists = await pool.query(`SELECT 1 FROM menu_items WHERE id = $1 AND cafe_id = $2`, [
      itemId,
      cafeId,
    ]);
    if (exists.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Menu item not found',
        code: ApiErrorCode.NOT_FOUND,
      });
    }
  }

  if (modifierGroupIds !== undefined) {
    await setMenuItemModifierGroups(pool, itemId, modifierGroupIds);
  }

  const item = await loadMergedItem(cafeId, itemId);
  return res.json({ ok: true, data: item });
});

menuRouter.post(
  '/:itemId/image',
  requireMenuMutationAuth,
  menuItemImageUpload,
  async (req, res) => {
    const rawId = req.params.itemId;
    const itemId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!itemId || !UUID_RE.test(itemId)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid item id',
        code: ApiErrorCode.VALIDATION,
      });
    }

    const cafeId = req.cafe!.cafeId;
    const file = req.file;
    if (!file?.buffer?.length) {
      return res.status(400).json({
        ok: false,
        error: 'image file is required',
        code: ApiErrorCode.VALIDATION,
      });
    }

    const existing = await pool.query<{ image_url: string | null }>(
      `SELECT image_url FROM menu_items WHERE id = $1 AND cafe_id = $2`,
      [itemId, cafeId],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Menu item not found',
        code: ApiErrorCode.NOT_FOUND,
      });
    }

    try {
      const imageUrl = await uploadMenuItemThumbnail({
        cafeId,
        itemId,
        fileBuffer: file.buffer,
        previousImageUrl: existing.rows[0]!.image_url,
      });

      await pool.query(`UPDATE menu_items SET image_url = $1 WHERE id = $2 AND cafe_id = $3`, [
        imageUrl,
        itemId,
        cafeId,
      ]);

      const item = await loadMergedItem(cafeId, itemId);
      return res.json({ ok: true, data: item });
    } catch (e) {
      if (e instanceof MenuImageValidationError) {
        return res.status(e.status).json({
          ok: false,
          error: e.message,
          code: ApiErrorCode.VALIDATION,
        });
      }
      throw e;
    }
  },
);

menuRouter.delete('/:itemId', requireMenuMutationAuth, async (req, res) => {
  const rawDel = req.params.itemId;
  const itemId = Array.isArray(rawDel) ? rawDel[0] : rawDel;
  if (!itemId || !UUID_RE.test(itemId)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid item id',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const cafeId = req.cafe!.cafeId;

  const { rowCount } = await pool.query(
    `UPDATE menu_items SET is_available = FALSE WHERE id = $1 AND cafe_id = $2`,
    [itemId, cafeId],
  );
  if (rowCount === 0) {
    return res.status(404).json({
      ok: false,
      error: 'Menu item not found',
      code: ApiErrorCode.NOT_FOUND,
    });
  }
  return res.json({ ok: true, data: { removed: true } });
});

menuRouter.get('/:segment', async (req, res) => {
  const rawSeg = req.params.segment;
  const segment = Array.isArray(rawSeg) ? rawSeg[0] : rawSeg;
  if (!segment) {
    return res.status(400).json({
      ok: false,
      error: 'Missing segment',
      code: ApiErrorCode.VALIDATION,
    });
  }
  if (RESERVED_MENU_SEGMENTS.has(segment) || UUID_RE.test(segment)) {
    return res.status(404).json({
      ok: false,
      error: 'Not found',
      code: ApiErrorCode.NOT_FOUND,
    });
  }

  if (!MENU_CATEGORIES.includes(segment as MenuCategory)) {
    return res.status(404).json({
      ok: false,
      error: 'Unknown category',
      code: ApiErrorCode.NOT_FOUND,
    });
  }

  const adapter = getPosAdapter(req.cafe!.posProvider as PosProvider, req.cafe!.posConfig);
  const menu = await adapter.fetchMenu(req.cafe!.cafeId);
  const filtered = {
    ...menu,
    items: menu.items.filter((item) => item.category === segment),
  };
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ ok: true, data: filtered });
});
