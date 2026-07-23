import { Router } from 'express';
import { ApiErrorCode, isDrinkArchetypeId } from '@moonshot/types';
import { pool } from '../db.js';
import {
  applyArchetypeToItems,
  getCafeDrinkArchetypeConfig,
  patchCafeDrinkArchetypeConfig,
} from '../lib/drink-archetype-service.js';
import { ApiHttpError } from '../lib/http-errors.js';
import { requireMenuMutationAuth } from '../middleware/menu-mutation-auth.js';

export const drinkArchetypesRouter: Router = Router();

drinkArchetypesRouter.get('/', requireMenuMutationAuth, async (req, res) => {
  const data = await getCafeDrinkArchetypeConfig(pool, req.cafe!.cafeId);
  return res.json({ ok: true, data });
});

drinkArchetypesRouter.patch('/', requireMenuMutationAuth, async (req, res) => {
  const data = await patchCafeDrinkArchetypeConfig(
    pool,
    req.cafe!.cafeId,
    req.body as Record<string, unknown>,
  );
  return res.json({ ok: true, data });
});

drinkArchetypesRouter.post('/:archetypeId/apply', requireMenuMutationAuth, async (req, res) => {
  const raw = req.params.archetypeId;
  const archetypeId = Array.isArray(raw) ? raw[0] : raw;
  if (!archetypeId || !isDrinkArchetypeId(archetypeId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid archetype id');
  }
  const data = await applyArchetypeToItems(pool, req.cafe!.cafeId, archetypeId);
  return res.json({ ok: true, data });
});
