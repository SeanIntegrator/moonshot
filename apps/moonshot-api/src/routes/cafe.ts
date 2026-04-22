import { Router } from 'express';
import type { Cafe, PosProvider } from '@moonshot/types';
import { activeFeatureKeys } from '../lib/cafe-map.js';
import { requireCafeContext } from '../middleware/cafe-context.js';

export const cafeRouter: Router = Router();

cafeRouter.get('/:slug', requireCafeContext, (req, res) => {
  const c = req.cafe!;
  const cafe: Cafe = {
    id: c.cafeId,
    name: c.name,
    slug: c.slug,
    posProvider: c.posProvider as PosProvider,
    paymentProvider: c.paymentProvider,
    features: c.features,
    themeId: c.themeId,
    themeOverrides: c.themeOverrides,
    kdsConfig: c.kdsConfig,
    timezone: c.timezone,
    ownerFeedbackEmail: c.ownerFeedbackEmail,
  };

  res.set('Cache-Control', 'public, max-age=3600');
  return res.json({
    ok: true,
    data: {
      cafe,
      activeFeatures: activeFeatureKeys(c.features),
    },
  });
});
