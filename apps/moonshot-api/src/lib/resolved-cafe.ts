import type {
  BaseThemeId,
  CafeFeatures,
  CafeThemeOverrides,
  KdsConfig,
  RequestCafeContext,
} from '@moonshot/types';
import type { CafeHours } from '@moonshot/types';

/** `cafes` row mapped to API-facing camelCase + request context */
export interface ResolvedCafe extends RequestCafeContext {
  name: string;
  posProvider: string;
  posConfig: Record<string, unknown>;
  paymentProvider: string;
  paymentConfig: Record<string, unknown>;
  features: CafeFeatures;
  themeId: BaseThemeId;
  themeOverrides: CafeThemeOverrides;
  kdsConfig: KdsConfig;
  timezone: string;
  hours: CafeHours;
  ownerFeedbackEmail: string | null;
}
