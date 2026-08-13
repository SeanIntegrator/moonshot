/**
 * Café config, feature flags, theme tokens, and KDS display config.
 */

import type { CafeHours } from './cafe-hours-contract.js';
import type { FeatureFlagKey } from './feature-flags-contract.js';
import type { PosProvider } from './pos-contract.js';

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
  /**
   * Google Fonts (or similar) stylesheet URLs to inject when this theme is active.
   * Empty when fonts are already system stacks or loaded elsewhere.
   */
  webfontUrls?: string[];
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
  /** Arbitrary review / ratings URL (Google, TripAdvisor, etc.). */
  reviewUrl: string | null;
  /** Legacy — readable for migration; prefer `reviewUrl`. */
  googlePlaceId?: string | null;
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
  /** ISO timestamp set when owner completes post-signup wizard */
  onboarding_completed_at?: string | null;
}

export interface MilkColorConfig {
  bg: string;
  text: string;
  isDark: boolean;
}

/**
 * KDS milk colour chips + bean badges — stored on cafés.kds_config;
 * board UI derives KdsPrep client-side via deriveLinePrep (see @moonshot/domain).
 */
export interface BeanBadgeStyle {
  label: string;
  bg: string;
  text: string;
  /** Accent colour for Flow shot brackets (e.g. house orange). */
  accent?: string;
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
  /** Milk / milk-like groups → square chips */
  coffeeModifiers: string[];
  /** Syrups / extras → round chips */
  additions: string[];
  /** Shot-count groups (Single / Double / Triple / …) */
  shots: string[];
  /** Bean / roast groups (House / Decaf / Guest) */
  beans: string[];
  /** Milk temperature groups (Hot / Warm / Extra Hot / …) */
  milkTemperature: string[];
  /** Milk texture groups (Standard / Wet / Dry / Extra Foam) */
  milkTexture: string[];
  /** Ice level groups (Light / Regular / Extra) */
  iceLevel?: string[];
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

/** Built-in WebAudio tones — catalogue lives in `@moonshot/domain` `KDS_SOUNDS`. */
export type KdsSoundId = 'chime' | 'ping' | 'marimba' | 'bell' | 'knock';

export interface KdsAudioConfig {
  /** Café-wide kill switch; a device can additionally mute itself. */
  enabled: boolean;
  newOrderSound: KdsSoundId | null;
  overdueSound: KdsSoundId | null;
  /** Re-chime cadence while a ticket is past due. 0 disables the repeat. */
  overdueRepeatSeconds: number;
  volume: number;
}

export interface KdsDisplayPreferences {
  showCustomerNameInHeader: boolean;
  showPickupTime: boolean;
  showOrderSource: boolean;
}

/** Rudimentary auto-ETA tuning (v1) — see docs/current/flows.md */
export interface KdsEtaConfig {
  basePrepMinutes: number;
  perItemMinutes: number;
}

/**
 * `cafes.kds_config` JSON — layout/ETA shipped; milk/chip prep hints are planned.
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
  /**
   * Section keys treated as food on the KDS board / loyalty pastry rewards.
   * Maintained from menu_sections.kind; replaces the legacy `category === 'food'` check.
   */
  foodSectionKeys?: string[];
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
  /** Weekly local hours; empty days / empty object → treated as closed. */
  hours: CafeHours;
  ownerFeedbackEmail: string | null;
}

/** Public resolution from Host / subdomain / header */
export interface CafeResolution {
  cafe: Cafe;
  theme: CafeTheme;
  /** Keys with a non-null feature object and enabled where applicable */
  activeFeatures: FeatureFlagKey[];
}
