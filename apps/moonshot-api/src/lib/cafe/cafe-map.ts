import type { BaseThemeId, CafeFeatures, CafeTheme, KdsConfig } from '@moonshot/types';
import type { FeatureFlagKey } from '@moonshot/types';
import { FeatureFlagKeys } from '@moonshot/types';
import {
  DEFAULT_BEAN_ACCENTS,
  DEFAULT_MODIFIER_CLASSIFICATION,
  normalizeCafeHours,
  normalizeKdsAudio,
} from '@moonshot/domain';
import type { ResolvedCafe } from '../resolved-cafe.js';

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
  hours: unknown;
  owner_feedback_email: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Fill Flow classification / bean accent gaps so older kds_config rows stay usable. */
function normalizeKdsConfig(raw: KdsConfig, cafeId: string): KdsConfig {
  const mc = raw.modifierClassification ?? {
    coffeeModifiers: [],
    additions: [],
    shots: [],
    beans: [],
    milkTemperature: [],
    milkTexture: [],
  };
  const badges = raw.beanBadges;
  const defaultHouse = { label: 'Ho', bg: '#2d2d2d', text: '#f5f5f5' };
  const defaultDecaf = { label: 'Dc', bg: '#6b4f2a', text: '#fff' };
  const defaultGuest = { label: 'Gu', bg: '#1a4d3a', text: '#fff' };
  return {
    ...raw,
    cafeId,
    modifierClassification: {
      coffeeModifiers:
        mc.coffeeModifiers?.length > 0
          ? mc.coffeeModifiers
          : [...DEFAULT_MODIFIER_CLASSIFICATION.coffeeModifiers],
      additions:
        mc.additions?.length > 0
          ? mc.additions
          : [...DEFAULT_MODIFIER_CLASSIFICATION.additions],
      shots: mc.shots?.length > 0 ? mc.shots : [...DEFAULT_MODIFIER_CLASSIFICATION.shots],
      beans: mc.beans?.length > 0 ? mc.beans : [...DEFAULT_MODIFIER_CLASSIFICATION.beans],
      milkTemperature:
        mc.milkTemperature?.length > 0
          ? mc.milkTemperature
          : [...DEFAULT_MODIFIER_CLASSIFICATION.milkTemperature],
      milkTexture:
        mc.milkTexture?.length > 0
          ? mc.milkTexture
          : [...DEFAULT_MODIFIER_CLASSIFICATION.milkTexture],
    },
    beanBadges: {
      house: {
        ...defaultHouse,
        ...(badges?.house ?? {}),
        accent: badges?.house?.accent ?? DEFAULT_BEAN_ACCENTS.house,
      },
      decaf: {
        ...defaultDecaf,
        ...(badges?.decaf ?? {}),
        accent: badges?.decaf?.accent ?? DEFAULT_BEAN_ACCENTS.decaf,
      },
      guest: {
        ...defaultGuest,
        ...(badges?.guest ?? {}),
        accent: badges?.guest?.accent ?? DEFAULT_BEAN_ACCENTS.guest,
      },
      custom: [...(badges?.custom ?? [])],
    },
    audio: normalizeKdsAudio(raw.audio),
  };
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
  const kdsConfig = normalizeKdsConfig(row.kds_config as KdsConfig, row.id);

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
    hours: normalizeCafeHours(row.hours),
    ownerFeedbackEmail: row.owner_feedback_email,
    enabledFlags: activeFeatureKeys(features),
  };
}
