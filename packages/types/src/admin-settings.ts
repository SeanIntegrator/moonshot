/**
 * Admin dashboard PATCH — merges into `cafes.features`, `kds_config`, hours, theme.
 */

import type {
  BaseThemeId,
  Cafe,
  CafeBrandOverrides,
  KdsConfig,
  LoyaltyFeatureConfig,
  OrderAheadFeatureConfig,
  ReviewNudgeFeatureConfig,
} from './cafe.js';
import type { CafeHours, LastOrderBufferMinutes } from './cafe-hours-contract.js';
import type { FeatureFlagKey } from './feature-flags-contract.js';

/** Partial updates merged server-side into existing `features`. */
export interface AdminFeaturesPatch {
  loyalty?: Partial<LoyaltyFeatureConfig> | null;
  order_ahead?: Partial<OrderAheadFeatureConfig>;
  review_nudge?: Partial<ReviewNudgeFeatureConfig> | null;
}

/** Whitelisted KDS keys merged into existing `kds_config`. */
export interface AdminKdsConfigPatch {
  layout?: Partial<Pick<KdsConfig['layout'], 'columns' | 'groupBy'>>;
  display?: Partial<KdsConfig['display']>;
  eta?: Partial<KdsConfig['eta']>;
  timerThresholds?: Partial<KdsConfig['timerThresholds']>;
  audio?: Partial<KdsConfig['audio']>;
}

export interface AdminSettingsPatchBody {
  featuresPatch?: AdminFeaturesPatch;
  kdsConfigPatch?: AdminKdsConfigPatch;
  /** Replace weekly hours when present (validated server-side). */
  hours?: CafeHours;
  /** Minutes before close after which order-ahead stops. Saved with weekly hours. */
  lastOrderBufferMinutes?: LastOrderBufferMinutes;
  /** Child theme pack id. */
  themeId?: BaseThemeId;
  /** Brand recipe merged into `theme_overrides.brand`. */
  brand?: CafeBrandOverrides | null;
}

export interface AdminSettingsResponse {
  cafe: Cafe;
  activeFeatures: FeatureFlagKey[];
}
