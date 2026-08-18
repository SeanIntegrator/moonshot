import { Router } from 'express';
import { cafeOpenStatusForCafe } from '@moonshot/domain';
import { activeFeatureKeys } from '../lib/cafe/cafe-map.js';
import { toPublicCafe } from '../lib/to-public-cafe.js';
import { requireCafeContext } from '../middleware/cafe-context.js';

export const cafeRouter: Router = Router();

cafeRouter.get('/:slug', requireCafeContext, (req, res) => {
  const c = req.cafe!;
  const cafe = toPublicCafe(c);
  const open = cafeOpenStatusForCafe(c);

  // Pause and last-order buffer change within the hour — do not CDN-cache isOpen.
  res.set('Cache-Control', 'private, no-store');
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
