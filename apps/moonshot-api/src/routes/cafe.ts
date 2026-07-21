import { Router } from 'express';
import { cafeOpenStatus } from '@moonshot/types';
import { activeFeatureKeys } from '../lib/cafe-map.js';
import { toPublicCafe } from '../lib/to-public-cafe.js';
import { requireCafeContext } from '../middleware/cafe-context.js';

export const cafeRouter: Router = Router();

cafeRouter.get('/:slug', requireCafeContext, (req, res) => {
  const c = req.cafe!;
  const cafe = toPublicCafe(c);
  const open = cafeOpenStatus(cafe.hours, cafe.timezone);

  // Hours are cacheable; isOpen is recomputed here and also client-side from hours.
  res.set('Cache-Control', 'public, max-age=60');
  return res.json({
    ok: true,
    data: {
      cafe,
      activeFeatures: activeFeatureKeys(c.features),
      isOpen: open.isOpen,
      hoursCaption: open.caption,
    },
  });
});
