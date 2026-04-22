import type { BaseThemeId, CafeFeatures, CafeTheme, KdsConfig } from '@moonshot/types';
import type { FeatureFlagKey } from '@moonshot/types';
import { FeatureFlagKeys } from '@moonshot/types';
import type { ResolvedCafe } from './resolved-cafe.js';

type CafeRow = {
  id: string;
  name: string;
  slug: string;
  pos_provider: string;
  pos_config: unknown;
  payment_provider: string;
  payment_config: unknown;
  features: unknown;
  theme_id: string;
  theme_overrides: unknown;
  kds_config: unknown;
  timezone: string;
  owner_feedback_email: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Derive enabled feature flag keys from `CafeFeatures` JSON */
export function activeFeatureKeys(features: CafeFeatures): FeatureFlagKey[] {
  const keys: FeatureFlagKey[] = [];
  const f = features;
  if (f.loyalty?.enabled) keys.push(FeatureFlagKeys.loyalty);
  if (f.events?.enabled) keys.push(FeatureFlagKeys.events);
  if (f.promotions?.enabled) keys.push(FeatureFlagKeys.promotions);
  if (f.order_ahead?.enabled) keys.push(FeatureFlagKeys.orderAhead);
  if (f.review_nudge?.enabled) keys.push(FeatureFlagKeys.reviewNudge);
  if (f.saved_orders?.enabled) keys.push(FeatureFlagKeys.savedOrders);
  if (f.whatsapp_ordering?.enabled) keys.push(FeatureFlagKeys.whatsappOrdering);
  return keys;
}

export function mapCafeRow(row: CafeRow): ResolvedCafe {
  const features = row.features as CafeFeatures;
  const themeOverrides = (row.theme_overrides || {}) as Partial<CafeTheme>;
  let kdsConfig = row.kds_config as KdsConfig;
  kdsConfig = {
    ...kdsConfig,
    cafeId: row.id,
  };

  return {
    cafeId: row.id,
    slug: row.slug,
    name: row.name,
    posProvider: row.pos_provider,
    posConfig: asRecord(row.pos_config),
    paymentProvider: row.payment_provider,
    paymentConfig: asRecord(row.payment_config),
    features,
    themeId: row.theme_id as BaseThemeId,
    themeOverrides,
    kdsConfig,
    timezone: row.timezone,
    ownerFeedbackEmail: row.owner_feedback_email,
    enabledFlags: activeFeatureKeys(features),
  };
}
