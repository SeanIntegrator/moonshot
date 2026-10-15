/**
 * Isolated contracts for the Menu Engineering tool.
 *
 * Boundary note: kept completely separate from POS / Order-Ahead / KDS menu
 * contracts so the tool can live on `@moonshot/marketing` (free lead magnet)
 * and evolve into a standalone or paid module without coupling to café tables.
 */

export const MENU_ENGINEERING_REGION_TIERS = ['london', 'city', 'town'] as const;
export type MenuEngineeringRegionTier = (typeof MENU_ENGINEERING_REGION_TIERS)[number];

export const MENU_ENGINEERING_TIERS = ['free', 'paid'] as const;
export type MenuEngineeringTier = (typeof MENU_ENGINEERING_TIERS)[number];

/**
 * Single switch controlling free vs. paid capabilities.
 * UI components read this object rather than scattering tier checks.
 */
export interface MenuEngineeringEntitlements {
  tier: MenuEngineeringTier;
  canExtractAndAuditPricing: boolean;
  canRestructureMenuLayout: boolean;
  canRewriteMenuCopy: boolean;
  canExportPrintTemplates: boolean;
  canSaveAndHostQrMenu: boolean;
}

export const CANONICAL_MENU_CATEGORIES = [
  'espresso_based',
  'filter_coffee',
  'tea_chai_matcha',
  'iced_drinks',
  'soft_drinks',
  'pastries_bakes',
  'brunch_mains',
  'sides_addons',
  'other',
] as const;

export type CanonicalMenuCategory = (typeof CANONICAL_MENU_CATEGORIES)[number];

/**
 * Fixed catalogue of ~40 UK specialty-café items plus `'other'`.
 * Vision extraction constrains the model to pick from this enum rather than free text.
 */
export const CANONICAL_ITEM_IDS = [
  'espresso',
  'double_espresso',
  'macchiato',
  'cortado',
  'piccolo',
  'flat_white',
  'latte',
  'cappuccino',
  'americano',
  'long_black',
  'mocha',
  'filter_batch_brew',
  'pour_over_v60',
  'cold_brew',
  'iced_latte',
  'iced_americano',
  'iced_matcha',
  'matcha_latte',
  'chai_latte',
  'dirty_chai',
  'hot_chocolate',
  'english_breakfast_tea',
  'specialty_loose_tea',
  'fresh_juice_smoothie',
  'kombucha_craft_soda',
  'croissant',
  'pain_au_chocolat',
  'almond_croissant',
  'cinnamon_cardamom_bun',
  'banana_bread_loaf',
  'brownie_cookie',
  'sourdough_toast_butter',
  'eggs_on_toast',
  'avocado_on_sourdough',
  'eggs_benedict_royale',
  'shakshuka_baked_eggs',
  'full_cooked_breakfast',
  'sweet_brunch_pancakes_french_toast',
  'granola_acai_bowl',
  'breakfast_brioche_bap',
  'lunch_toastie_sandwiches',
  'modifier_syrup_shot',
  'modifier_plant_milk',
  'modifier_extra_espresso_shot',
  'modifier_extra_poached_egg',
  'modifier_premium_brunch_side',
  'other',
] as const;

export type CanonicalItemId = (typeof CANONICAL_ITEM_IDS)[number];

export const MENU_GROUP_KINDS = [
  'main',
  'specials',
  'kids',
  'evening_drinks',
  'seasonal',
] as const;

export type MenuGroupKind = (typeof MENU_GROUP_KINDS)[number];

export interface ExtractedSizeVariant {
  label: string;
  pricePounds: number;
}

export interface ExtractedMenuModifier {
  id: string;
  name: string;
  pricePounds: number;
  scope: 'item' | 'section';
  targetSection?: string;
  canonicalId?: CanonicalItemId;
}

export interface ExtractedMenuItem {
  id: string;
  name: string;
  section: string;
  groupKind: MenuGroupKind;
  pricePounds: number;
  sizeVariants: ExtractedSizeVariant[];
  description: string | null;
  dietaryCodes: string[];
  canonicalId: CanonicalItemId;
  modifiers: ExtractedMenuModifier[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractedMenuPayload {
  cafeNameGuess: string | null;
  sections: string[];
  menuGroups: MenuGroupKind[];
  sectionModifiers: ExtractedMenuModifier[];
  items: ExtractedMenuItem[];
  extractionNotes: string[];
  sourceMode: 'gemini_vision' | 'sample_preset';
}

export interface BenchmarkRow {
  canonicalId: CanonicalItemId;
  label: string;
  category: CanonicalMenuCategory;
  regionTier: MenuEngineeringRegionTier;
  lowPricePounds: number;
  typicalPricePounds: number;
  highPricePounds: number;
  /** Typical cost of goods sold (COGS) % for UK specialty cafés (e.g. 16 = 16% cost, 84% gross margin). */
  typicalCostPercent: number;
  source: string;
  updatedAt: string;
}

export type PricePositionStatus =
  | 'below_range'
  | 'in_range_low'
  | 'optimal'
  | 'in_range_high'
  | 'above_range'
  | 'unbenchmarked';

export interface ItemPriceFinding {
  itemId: string;
  itemName: string;
  section: string;
  canonicalId: CanonicalItemId;
  canonicalLabel: string;
  category: CanonicalMenuCategory;
  pricePounds: number;
  benchmarkLowPounds: number | null;
  benchmarkTypicalPounds: number | null;
  benchmarkHighPounds: number | null;
  typicalCostPercent: number | null;
  estimatedGrossMarginPercent: number | null;
  deltaVsTypicalPounds: number | null;
  status: PricePositionStatus;
  findingSummary: string;
  confidence: 'high' | 'medium' | 'low';
  benchmarkSource: string | null;
}

export type StructureFlagKind =
  | 'size_upcharge'
  | 'brunch_clustering'
  | 'missing_anchor'
  | 'section_length'
  | 'missing_addons'
  | 'syrup_pricing'
  | 'missing_specials';

export interface LadderAndStructureFlag {
  id: string;
  kind: StructureFlagKind;
  severity: 'opportunity' | 'watch' | 'good';
  title: string;
  detail: string;
  evidence: string;
}

export interface CategoryMarginSummary {
  category: CanonicalMenuCategory;
  categoryLabel: string;
  itemCount: number;
  shareOfMenuPercent: number;
  averagePricePounds: number;
  typicalCostPercent: number;
  estimatedGrossMarginPercent: number;
}

export interface ConcreteSuggestion {
  id: string;
  title: string;
  category: 'pricing' | 'ladder' | 'addons' | 'structure';
  summary: string;
  action: string;
  /** Monthly gross profit uplift at `baselineCustomersPerDay`; UI slider scales linearly from this baseline. */
  estimatedMonthlyUpliftPoundsAtBaseline: number;
  assumptionsNote: string;
}

export interface MenuEngineeringFindings {
  regionTier: MenuEngineeringRegionTier;
  baselineCustomersPerDay: number;
  totalMonthlyOpportunityPoundsAtBaseline: number;
  itemFindings: ItemPriceFinding[];
  ladderAndStructureFlags: LadderAndStructureFlag[];
  categorySummaries: CategoryMarginSummary[];
  suggestions: ConcreteSuggestion[];
  benchmarkMetadata: {
    sourceSummary: string;
    lastReviewed: string;
  };
}

export interface MenuEngineeringNarrative {
  headline: string;
  executiveSummary: string;
  pricingCommentary: string;
  structureAndLadderCommentary: string;
  methodologyAndLimitsNote: string;
  generatedBy: 'gemini' | 'deterministic_fallback';
}

export interface MenuEngineeringAnalysisRequest {
  menu: ExtractedMenuPayload;
  regionTier: MenuEngineeringRegionTier;
  tier?: MenuEngineeringTier;
}

export interface MenuEngineeringAnalysisResponse {
  findings: MenuEngineeringFindings;
  narrative: MenuEngineeringNarrative;
  entitlements: MenuEngineeringEntitlements;
}
