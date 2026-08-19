import { Router } from 'express';
import { ApiErrorCode, type MenuSectionCreateBody, type MenuSectionPatchBody } from '@moonshot/types';
import { pool } from '../db.js';
import { ApiHttpError } from '../lib/http-errors.js';
import {
  createMenuSection,
  deleteMenuSection,
  ensureSystemMenuSections,
  listMenuSectionsForCafe,
  updateMenuSection,
} from '../lib/menu/menu-sections.js';
import { UUID_RE } from '../lib/uuid.js';
import { requireCafeContext } from '../middleware/cafe-context.js';
import { requireMenuMutationAuth } from '../middleware/menu-mutation-auth.js';

export const menuSectionsRouter: Router = Router();

menuSectionsRouter.use(requireCafeContext);

menuSectionsRouter.get('/', async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  await ensureSystemMenuSections(pool, cafeId);
  const sections = await listMenuSectionsForCafe(pool, cafeId);
  return res.json({ ok: true, data: sections });
});

menuSectionsRouter.post('/', requireMenuMutationAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  await ensureSystemMenuSections(pool, cafeId);
  const section = await createMenuSection(pool, cafeId, req.body as MenuSectionCreateBody);
  return res.status(201).json({ ok: true, data: section });
});

menuSectionsRouter.patch('/:sectionId', requireMenuMutationAuth, async (req, res) => {
  const rawId = req.params.sectionId;
  const sectionId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!sectionId || !UUID_RE.test(sectionId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid section id');
  }

  const updated = await updateMenuSection(
    pool,
    req.cafe!.cafeId,
    sectionId,
    req.body as MenuSectionPatchBody,
  );
  if (!updated) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Menu section not found');
  }
  return res.json({ ok: true, data: updated });
});

menuSectionsRouter.delete('/:sectionId', requireMenuMutationAuth, async (req, res) => {
  const rawId = req.params.sectionId;
  const sectionId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!sectionId || !UUID_RE.test(sectionId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid section id');
  }

  const removed = await deleteMenuSection(pool, req.cafe!.cafeId, sectionId);
  if (!removed) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Menu section not found');
  }
  return res.json({ ok: true, data: { removed: true } });
});
