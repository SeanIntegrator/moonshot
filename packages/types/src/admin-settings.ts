/**
 * Admin dashboard PATCH — merges into `cafes.features` and `cafes.kds_config`.
 */

import type {
  Cafe,
  KdsConfig,
  LoyaltyFeatureConfig,
  OrderAheadFeatureConfig,
} from './cafe.js';
import type { FeatureFlagKey } from './feature-flags.js';

/** Partial updates merged server-side into existing `features` (only loyalty + order_ahead). */
export interface AdminFeaturesPatch {
  loyalty?: Partial<LoyaltyFeatureConfig> | null;
  order_ahead?: Partial<OrderAheadFeatureConfig>;
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
}

export interface AdminSettingsResponse {
  cafe: Cafe;
  activeFeatures: FeatureFlagKey[];
}
