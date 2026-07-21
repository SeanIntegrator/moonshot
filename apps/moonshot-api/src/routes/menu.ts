import { Router } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import type { MenuCategory, PosProvider } from '@moonshot/types';
import { pool } from '../db.js';
import { ApiHttpError } from '../lib/http-errors.js';
import {
  assertMenuItemId,
  createMenuItem,
  MENU_CATEGORIES,
  patchMenuItem,
  softHideMenuItem,
  uploadMenuItemImage,
} from '../lib/menu-admin-service.js';
import { fetchMenuForCafe } from '../lib/menu-fetch.js';
import { UUID_RE } from '../lib/uuid.js';
import { getPosAdapter } from '../lib/pos-adapters/index.js';
import { requireCafeContext } from '../middleware/cafe-context.js';
import { menuItemImageUpload } from '../middleware/menu-item-image-upload.js';
import { requireMenuMutationAuth } from '../middleware/menu-mutation-auth.js';
import { modifierGroupsRouter } from './modifier-groups.js';

/** Literal path segments that must not be handled by GET /:segment */
const RESERVED_MENU_SEGMENTS = new Set(['manage']);

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
  const item = await createMenuItem(pool, req.cafe!.cafeId, req.body as Record<string, unknown>);
  return res.status(201).json({ ok: true, data: item });
});

menuRouter.patch('/:itemId', requireMenuMutationAuth, async (req, res) => {
  const rawId = req.params.itemId;
  const itemId = assertMenuItemId(Array.isArray(rawId) ? rawId[0] : rawId);
  const item = await patchMenuItem(
    pool,
    req.cafe!.cafeId,
    itemId,
    req.body as Record<string, unknown>,
  );
  return res.json({ ok: true, data: item });
});

menuRouter.post(
  '/:itemId/image',
  requireMenuMutationAuth,
  menuItemImageUpload,
  async (req, res) => {
    const rawId = req.params.itemId;
    const itemId = assertMenuItemId(Array.isArray(rawId) ? rawId[0] : rawId);
    const file = req.file;
    if (!file?.buffer?.length) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'image file is required');
    }
    const item = await uploadMenuItemImage(pool, req.cafe!.cafeId, itemId, file.buffer);
    return res.json({ ok: true, data: item });
  },
);

menuRouter.delete('/:itemId', requireMenuMutationAuth, async (req, res) => {
  const rawDel = req.params.itemId;
  const itemId = assertMenuItemId(Array.isArray(rawDel) ? rawDel[0] : rawDel);
  await softHideMenuItem(pool, req.cafe!.cafeId, itemId);
  return res.json({ ok: true, data: { removed: true } });
});

menuRouter.get('/:segment', async (req, res) => {
  const rawSeg = req.params.segment;
  const segment = Array.isArray(rawSeg) ? rawSeg[0] : rawSeg;
  if (!segment) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Missing segment');
  }
  if (RESERVED_MENU_SEGMENTS.has(segment) || UUID_RE.test(segment)) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Not found');
  }
  if (!MENU_CATEGORIES.includes(segment as MenuCategory)) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Unknown category');
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
