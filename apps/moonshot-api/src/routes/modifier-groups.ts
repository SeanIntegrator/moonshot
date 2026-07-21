import { Router } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../db.js';
import {
  createModifierGroup,
  deleteModifierGroup,
  listModifierGroupsForCafe,
  updateModifierGroup,
} from '../lib/menu-modifier-library.js';
import { requireCafeContext } from '../middleware/cafe-context.js';
import { requireMenuMutationAuth } from '../middleware/menu-mutation-auth.js';
import { UUID_RE } from '../lib/orders/order-constants.js';

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
    return res.status(400).json({ ok: false, error: msg, code: ApiErrorCode.VALIDATION });
  }
});

modifierGroupsRouter.patch('/:groupId', requireMenuMutationAuth, async (req, res) => {
  const rawId = req.params.groupId;
  const groupId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!groupId || !UUID_RE.test(groupId)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid group id',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const updated = await updateModifierGroup(
    pool,
    req.cafe!.cafeId,
    groupId,
    req.body as Record<string, unknown>,
  );
  if (!updated) {
    return res.status(404).json({
      ok: false,
      error: 'Modifier group not found',
      code: ApiErrorCode.NOT_FOUND,
    });
  }
  return res.json({ ok: true, data: updated });
});

modifierGroupsRouter.delete('/:groupId', requireMenuMutationAuth, async (req, res) => {
  const rawId = req.params.groupId;
  const groupId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!groupId || !UUID_RE.test(groupId)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid group id',
      code: ApiErrorCode.VALIDATION,
    });
  }

  const removed = await deleteModifierGroup(pool, req.cafe!.cafeId, groupId);
  if (!removed) {
    return res.status(404).json({
      ok: false,
      error: 'Modifier group not found',
      code: ApiErrorCode.NOT_FOUND,
    });
  }
  return res.json({ ok: true, data: { removed: true } });
});
