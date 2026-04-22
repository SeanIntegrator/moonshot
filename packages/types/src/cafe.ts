/**
 * Café config, feature flags, theme tokens, and KDS display config.
 */

import type { FeatureFlagKey } from './feature-flags.js';
import type { PosProvider } from './pos.js';

export type BaseThemeId = 'heritage' | 'botanical' | 'minimal' | 'bold' | 'classic';

export interface CafeThemeColors {
  primary: string;
  primaryContrast: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  textOnDark: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  heroBg: string;
  heroText: string;
}

export interface CafeThemeTypography {
  headingFamily: string;
  bodyFamily: string;
  headingWeight: number;
  bodyWeight: number;
}

export type MenuGridLayout = '2col' | '3col' | 'list';
export type CardStyle = 'rounded' | 'sharp' | 'pill';
export type HeroStyle = 'full' | 'compact' | 'none';
export type NavStyle = 'bottom_bar' | 'top_bar';

export interface CafeThemeLayout {
  menuGrid: MenuGridLayout;
  cardStyle: CardStyle;
  heroStyle: HeroStyle;
  navStyle: NavStyle;
}

export interface CafeTheme {
  id: string;
  colors: CafeThemeColors;
  typography: CafeThemeTypography;
  layout: CafeThemeLayout;
  /** Optional nested component tokens */
  components?: Record<string, Record<string, string | number>>;
}

export interface LoyaltyFeatureConfig {
  enabled: boolean;
  stampsPerReward: number;
  rewardDescription: string;
  doubleStampDays: string[];
}

export interface EventsFeatureConfig {
  enabled: boolean;
}

export interface PromotionsFeatureConfig {
  enabled: boolean;
}

export type OrderAheadPaymentProvider = 'stripe' | 'square_payment_links' | 'pay_in_store';

export interface OrderAheadFeatureConfig {
  enabled: boolean;
  paymentProvider: OrderAheadPaymentProvider;
  pickupTimeEnabled: boolean;
  defaultPickupMinutes: number;
  maxPickupMinutes: number;
  notesEnabled: boolean;
}

export interface ReviewNudgeFeatureConfig {
  enabled: boolean;
  googlePlaceId: string | null;
}

export interface SavedOrdersFeatureConfig {
  enabled: boolean;
}

export interface WhatsappOrderingFeatureConfig {
  enabled: boolean;
  phoneNumber: string | null;
}

/**
 * `cafes.features` JSON — each key matches `FeatureFlagKey` where applicable.
 */
export interface CafeFeatures {
  loyalty: LoyaltyFeatureConfig | null;
  events: EventsFeatureConfig | null;
  promotions: PromotionsFeatureConfig | null;
  order_ahead: OrderAheadFeatureConfig | null;
  review_nudge: ReviewNudgeFeatureConfig | null;
  saved_orders: SavedOrdersFeatureConfig | null;
  whatsapp_ordering: WhatsappOrderingFeatureConfig | null;
}

export interface MilkColorConfig {
  bg: string;
  text: string;
  isDark: boolean;
}

export interface BeanBadgeStyle {
  label: string;
  bg: string;
  text: string;
}

export interface CustomBeanBadge extends BeanBadgeStyle {
  border: string;
}

export interface KdsBeanBadges {
  house: BeanBadgeStyle;
  decaf: BeanBadgeStyle;
  guest: BeanBadgeStyle;
  custom: CustomBeanBadge[];
}

export interface KdsModifierClassification {
  coffeeModifiers: string[];
  additions: string[];
}

export interface KdsTimerThresholds {
  greenMax: number;
  amberMax: number;
}

export type KdsGroupBy = 'order_type' | 'none';

export interface KdsLayoutConfig {
  columns: number;
  groupBy: KdsGroupBy;
}

export interface KdsAudioConfig {
  newOrderSound: string | null;
  volume: number;
}

export interface KdsDisplayPreferences {
  showCustomerNameInHeader: boolean;
  showPickupTime: boolean;
  showOrderSource: boolean;
}

/** Rudimentary auto-ETA tuning (v1) — see docs/dataflow-sequences.md S5 */
export interface KdsEtaConfig {
  basePrepMinutes: number;
  perItemMinutes: number;
}

/**
 * `cafes.kds_config` JSON — barista-facing display + Flow prep hints.
 */
export interface KdsConfig {
  cafeId: string;
  milkColors: Record<string, MilkColorConfig>;
  beanBadges: KdsBeanBadges;
  modifierClassification: KdsModifierClassification;
  timerThresholds: KdsTimerThresholds;
  layout: KdsLayoutConfig;
  audio: KdsAudioConfig;
  display: KdsDisplayPreferences;
  eta: KdsEtaConfig;
}

export interface Cafe {
  id: string;
  name: string;
  slug: string;
  posProvider: PosProvider;
  paymentProvider: string;
  features: CafeFeatures;
  themeId: BaseThemeId;
  themeOverrides: Partial<CafeTheme>;
  kdsConfig: KdsConfig;
  timezone: string;
  ownerFeedbackEmail: string | null;
}

/** Public resolution from Host / subdomain / header */
export interface CafeResolution {
  cafe: Cafe;
  theme: CafeTheme;
  /** Keys with a non-null feature object and enabled where applicable */
  activeFeatures: FeatureFlagKey[];
}
