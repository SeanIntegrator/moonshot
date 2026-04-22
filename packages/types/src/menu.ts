/**
 * Normalised catalogue types — POS adapters write these shapes to Postgres;
 * apps read the same contract from the API.
 */

export type MenuCategory = 'hot_drinks' | 'cold_drinks' | 'food' | 'extras';

export type ModifierSelectionType = 'single' | 'multi';

export interface NormalisedModifierOption {
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
  options: NormalisedModifierOption[];
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
  modifierGroups: NormalisedModifierGroup[];
  tags: string[];
}

export interface NormalisedMenu {
  cafeId: string;
  items: NormalisedMenuItem[];
  /** ISO timestamp when this snapshot was produced */
  fetchedAt: string;
}
