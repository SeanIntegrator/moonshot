import { Router } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import type { MenuCategory, NormalisedModifierGroup } from '@moonshot/types';
import type { PosProvider } from '@moonshot/types';
import { pool } from '../db.js';
import { getPosAdapter } from '../lib/pos-adapters/index.js';
import { mapMenuItemRow } from '../lib/menu-map.js';
import { isMenuAdminEmail, requireAuth } from '../middleware/auth.js';
import { requireCafeContext } from '../middleware/cafe-context.js';

const MENU_CATEGORIES: MenuCategory[] = ['hot_drinks', 'cold_drinks', 'food', 'extras'];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const menuRouter: Router = Router();

menuRouter.use(requireCafeContext);

menuRouter.post('/', requireAuth, async (req, res) => {
  if (!isMenuAdminEmail(req.user?.email)) {
    return res.status(403).json({
      ok: false,
      error: 'Forbidden',
      code: ApiErrorCode.FORBIDDEN,
    });
  }

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
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;

  try {
    const { rows } = await pool.query(
      `INSERT INTO menu_items (
        cafe_id, pos_item_id, name, description, price_minor, currency, category, subcategory,
        image_url, emoji, is_available, tags, modifier_groups, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $12::jsonb, $13)
      RETURNING
        id, pos_item_id, name, description, price_minor, currency, category, subcategory,
        image_url, emoji, is_available, tags, modifier_groups`,
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
        sortOrder,
      ],
    );

    return res.status(201).json({
      ok: true,
      data: mapMenuItemRow(rows[0] as Parameters<typeof mapMenuItemRow>[0]),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});

menuRouter.patch('/:itemId', requireAuth, async (req, res) => {
  if (!isMenuAdminEmail(req.user?.email)) {
    return res.status(403).json({
      ok: false,
      error: 'Forbidden',
      code: ApiErrorCode.FORBIDDEN,
    });
  }

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
  if ('sortOrder' in body && typeof body.sortOrder === 'number') {
    sets.push(`sort_order = $${i++}`);
    values.push(body.sortOrder);
  }

  if (sets.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'No fields to update',
      code: ApiErrorCode.VALIDATION,
    });
  }

  values.push(itemId, cafeId);

  try {
    const { rows } = await pool.query(
      `UPDATE menu_items SET ${sets.join(', ')}
       WHERE id = $${i++} AND cafe_id = $${i++}
       RETURNING
         id, pos_item_id, name, description, price_minor, currency, category, subcategory,
         image_url, emoji, is_available, tags, modifier_groups`,
      values,
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Menu item not found',
        code: ApiErrorCode.NOT_FOUND,
      });
    }

    return res.json({
      ok: true,
      data: mapMenuItemRow(rows[0] as Parameters<typeof mapMenuItemRow>[0]),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});

menuRouter.delete('/:itemId', requireAuth, async (req, res) => {
  if (!isMenuAdminEmail(req.user?.email)) {
    return res.status(403).json({
      ok: false,
      error: 'Forbidden',
      code: ApiErrorCode.FORBIDDEN,
    });
  }

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

  try {
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
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});

menuRouter.get('/', async (req, res) => {
  try {
    const adapter = getPosAdapter(req.cafe!.posProvider as PosProvider);
    const menu = await adapter.fetchMenu(req.cafe!.cafeId);
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ ok: true, data: menu });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to load menu',
      code: ApiErrorCode.INTERNAL,
    });
  }
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
  if (UUID_RE.test(segment)) {
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

  try {
    const adapter = getPosAdapter(req.cafe!.posProvider as PosProvider);
    const menu = await adapter.fetchMenu(req.cafe!.cafeId);
    const filtered = {
      ...menu,
      items: menu.items.filter((item) => item.category === segment),
    };
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ ok: true, data: filtered });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to load menu',
      code: ApiErrorCode.INTERNAL,
    });
  }
});
