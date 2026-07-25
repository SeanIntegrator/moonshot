/**
 * Normalised catalogue types — POS adapters write these shapes to Postgres;
 * apps read the same contract from the API.
 */

/**
 * Section key on a menu item (`menu_items.category`).
 * Built-ins: `hot_drinks`, `cold_drinks`, `food`, `extras`.
 * Cafés may also define custom keys (e.g. `ube`, `pandan`) via `menu_sections`.
 */
export type MenuCategory = string;

/** Built-in section keys always provisioned for a café. */
export const SYSTEM_MENU_SECTION_KEYS = ['hot_drinks', 'cold_drinks', 'food'] as const;
export type SystemMenuSectionKey = (typeof SYSTEM_MENU_SECTION_KEYS)[number];

export const SYSTEM_MENU_SECTION_LABELS: Record<SystemMenuSectionKey, string> = {
  hot_drinks: 'Hot drinks',
  cold_drinks: 'Cold drinks',
  food: 'Food',
};

/** Café-scoped top-level menu section (Items tab grouping / order-ahead nav). */
export interface CafeMenuSection {
  id: string;
  cafeId: string;
  key: string;
  label: string;
  enabled: boolean;
  isSystem: boolean;
  sortOrder: number;
}

/** True when a category key should be treated as food (KDS / loyalty). */
export function isFoodMenuCategory(category: string): boolean {
  return category === 'food' || category.toLowerCase().includes('food');
}

/** True when a category key earns a free-drink loyalty reward. */
export function isDrinkMenuCategory(category: string): boolean {
  if (isFoodMenuCategory(category)) return false;
  if (category === 'extras') return false;
  return true;
}

export type ModifierSelectionType = 'single' | 'multi';

/** Optional KDS chip styling — baristas map colours to brands (e.g. pink = almond). */
export interface ModifierDisplayMeta {
  colorHex?: string | null;
  chipLabel?: string | null;
}

export interface NormalisedModifierOption extends ModifierDisplayMeta {
  /** Internal UUID */
  id: string;
  posOptionId: string | null;
  name: string;
  /** Minor units; 0 for free options */
  priceMinor: number;
  isDefault: boolean;
}

export interface NormalisedModifierGroup {
  id: string;
  name: string;
  selectionType: ModifierSelectionType;
  required: boolean;
  /** Max selections when `selectionType` is `multi`; omit for unlimited */
  maxSelect?: number | null;
  options: NormalisedModifierOption[];
}

/** Per-item size with absolute price — empty `sizes` means single-price item uses `priceMinor`. */
export interface NormalisedItemSize extends ModifierDisplayMeta {
  id: string;
  name: string;
  priceMinor: number;
  isDefault: boolean;
}

export interface NormalisedMenuItem {
  /** Internal UUID — never a POS id */
  id: string;
  posItemId: string | null;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: string;
  category: MenuCategory;
  subcategory: string | null;
  imageUrl: string | null;
  emoji: string | null;
  isAvailable: boolean;
  /** Ordered sizes; when non-empty, customer must pick one and `priceMinor` is the fallback/list anchor */
  sizes: NormalisedItemSize[];
  modifierGroups: NormalisedModifierGroup[];
  tags: string[];
  /** Drink archetype id when set — drives default modifier attachment in admin. */
  archetype: string | null;
  /**
   * When true, Milks option prices are treated as £0 for this item
   * (display + checkout). Typical for low-milk drinks (americano, tea).
   */
  waiveMilkSurcharge: boolean;
  /**
   * When true, a synthetic “No milk” option is injected into the Milks group
   * for this item (americano, iced americano, tea). Off for macchiato etc.
   */
  allowNoMilk: boolean;
}

/** Stable id for the synthetic “No milk” option injected when `allowNoMilk` is set. */
export const NO_MILK_OPTION_ID = '00000000-0000-4000-8000-00000000a001';

/** Café-scoped reusable modifier section (Milks, Syrups, Toppings) — admin library shape */
export interface CafeModifierGroup extends NormalisedModifierGroup {
  sortOrder: number;
}

export interface NormalisedMenu {
  cafeId: string;
  items: NormalisedMenuItem[];
  /** Café section registry — drives admin grouping and order-ahead nav labels. */
  sections: CafeMenuSection[];
  /** ISO timestamp when this snapshot was produced */
  fetchedAt: string;
}
