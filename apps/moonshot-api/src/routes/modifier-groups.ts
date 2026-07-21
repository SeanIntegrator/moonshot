import { Router } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../db.js';
import { ApiHttpError } from '../lib/http-errors.js';
import {
  createModifierGroup,
  deleteModifierGroup,
  listModifierGroupsForCafe,
  updateModifierGroup,
} from '../lib/menu-modifier-library.js';
import { UUID_RE } from '../lib/uuid.js';
import { requireCafeContext } from '../middleware/cafe-context.js';
import { requireMenuMutationAuth } from '../middleware/menu-mutation-auth.js';

export const modifierGroupsRouter: Router = Router();

modifierGroupsRouter.use(requireCafeContext);

modifierGroupsRouter.get('/', async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const groups = await listModifierGroupsForCafe(pool, cafeId);
  return res.json({ ok: true, data: groups });
});

modifierGroupsRouter.post('/', requireMenuMutationAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  try {
    const group = await createModifierGroup(pool, cafeId, req.body as Record<string, unknown>);
    return res.status(201).json({ ok: true, data: group });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Create failed';
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, msg);
  }
});

modifierGroupsRouter.patch('/:groupId', requireMenuMutationAuth, async (req, res) => {
  const rawId = req.params.groupId;
  const groupId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!groupId || !UUID_RE.test(groupId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid group id');
  }

  const updated = await updateModifierGroup(
    pool,
    req.cafe!.cafeId,
    groupId,
    req.body as Record<string, unknown>,
  );
  if (!updated) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Modifier group not found');
  }
  return res.json({ ok: true, data: updated });
});

modifierGroupsRouter.delete('/:groupId', requireMenuMutationAuth, async (req, res) => {
  const rawId = req.params.groupId;
  const groupId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!groupId || !UUID_RE.test(groupId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid group id');
  }

  const removed = await deleteModifierGroup(pool, req.cafe!.cafeId, groupId);
  if (!removed) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Modifier group not found');
  }
  return res.json({ ok: true, data: { removed: true } });
});
