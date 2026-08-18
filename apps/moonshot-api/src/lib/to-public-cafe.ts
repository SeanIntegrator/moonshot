import type { Cafe, PosProvider } from '@moonshot/types';
import type { ResolvedCafe } from './resolved-cafe.js';

/** Map internal resolved café row to the public `Cafe` DTO. */
export function toPublicCafe(c: ResolvedCafe): Cafe {
  return {
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
    hours: c.hours,
    pausedUntil: c.pausedUntil,
    lastOrderBufferMinutes: c.lastOrderBufferMinutes,
    hoursOverrides: c.hoursOverrides,
    ownerFeedbackEmail: c.ownerFeedbackEmail,
  };
}
