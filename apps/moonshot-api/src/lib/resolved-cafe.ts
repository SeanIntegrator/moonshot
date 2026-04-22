import type { BaseThemeId, CafeFeatures, CafeTheme, KdsConfig, RequestCafeContext } from '@moonshot/types';

/** `cafes` row mapped to API-facing camelCase + request context */
export interface ResolvedCafe extends RequestCafeContext {
  name: string;
  posProvider: string;
  posConfig: Record<string, unknown>;
  paymentProvider: string;
  paymentConfig: Record<string, unknown>;
  features: CafeFeatures;
  themeId: BaseThemeId;
  themeOverrides: Partial<CafeTheme>;
  kdsConfig: KdsConfig;
  timezone: string;
  ownerFeedbackEmail: string | null;
}
