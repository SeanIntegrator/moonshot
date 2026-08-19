/**
 * Admin menu mutation bodies — PATCH/POST for items, modifier lists, and sections.
 */

import type {
  MenuSectionKind,
  NormalisedItemSize,
  NormalisedModifierGroup,
  NormalisedModifierOption,
  ModifierSelectionType,
} from './menu.js';
import type { ModifierSlot } from './modifier-family.js';

export interface MenuItemWriteFields {
  name: string;
  description: string | null;
  priceMinor: number;
  category: string;
  subcategory: string | null;
  sizes: NormalisedItemSize[];
  imageUrl: string | null;
  isAvailable: boolean;
  modifierGroupIds: string[];
  archetype: string | null;
  waiveMilkSurcharge: boolean;
  allowNoMilk: boolean;
  tags: string[];
  emoji: string | null;
  currency: string;
  posItemId: string | null;
  modifierGroups: NormalisedModifierGroup[];
  sortOrder: number;
}

export type MenuItemPatchBody = Partial<MenuItemWriteFields>;

export type MenuItemCreateBody = Pick<MenuItemWriteFields, 'name' | 'priceMinor' | 'category'> &
  Partial<Omit<MenuItemWriteFields, 'name' | 'priceMinor' | 'category'>>;

export interface MenuItemDefaultImageBody {
  useDefaultImage: boolean;
}

export interface ModifierGroupWriteBody {
  name?: string;
  selectionType?: ModifierSelectionType;
  required?: boolean;
  maxSelect?: number | null;
  options?: NormalisedModifierOption[];
  sortOrder?: number;
  slot?: ModifierSlot;
}

export interface ModifierGroupCreateBody extends ModifierGroupWriteBody {
  name: string;
}

export interface MenuSectionCreateBody {
  label: string;
  key?: string;
  kind: Extract<MenuSectionKind, 'food' | 'drink'>;
  parentKey?: string;
}

export interface MenuSectionPatchBody {
  label?: string;
  enabled?: boolean;
  sortOrder?: number;
  kind?: Extract<MenuSectionKind, 'food' | 'drink'>;
}
