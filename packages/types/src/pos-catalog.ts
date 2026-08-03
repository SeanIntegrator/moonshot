/**
 * POS-neutral catalogue contract.
 * Square / Lightspeed adapters normalise into these shapes; the API upserts them into Postgres.
 */

import type {
  CafeMenuSection,
  MenuSectionKind,
  NormalisedMenuItem,
  NormalisedModifierGroup,
} from './menu.js';

/** Hint for chip palette + KDS modifierClassification sync. */
export type ModifierRoleHint = 'milk' | 'syrup' | 'topping' | 'other';

export type { MenuSectionKind };
/**
 * POS-sourced menu section (may form a two-level tree via `parentKey`).
 * `key` is Moonshot-stable; `posCategoryId` is the POS-side id used for rename-safe matching.
 */
export interface PosCatalogSection {
  key: string;
  label: string;
  /** Parent section key; null for top-level nav tabs. */
  parentKey: string | null;
  /** POS category id (Square CATEGORY id, etc.). Null for Moonshot-only sections. */
  posCategoryId: string | null;
  kind: MenuSectionKind;
  enabled: boolean;
  sortOrder: number;
}

/** Modifier group carried from a POS modifier list, with POS id + role hint. */
export type PosCatalogModifierGroup = NormalisedModifierGroup & {
  posGroupId: string;
  role: ModifierRoleHint;
};

/**
 * POS catalogue snapshot ready for upsert.
 * Items use `category` = leaf section key; `modifierGroups[].id` is the POS group id
 * (resolved to DB uuid by the upsert layer via `groupsByPosId`).
 */
export interface PosCatalog {
  cafeId: string;
  sections: PosCatalogSection[];
  items: NormalisedMenuItem[];
  groupsByPosId: Map<string, PosCatalogModifierGroup>;
  /** Square item ids deleted/archived in this snapshot (sync soft-delete). */
  deletedPosItemIds: string[];
  fetchedAt: string;
}

/** Convert PosCatalog sections into CafeMenuSection stubs (ids filled at persist). */
export function posSectionsToCafeSections(
  cafeId: string,
  sections: PosCatalogSection[],
): CafeMenuSection[] {
  return sections.map((s, i) => ({
    id: `pos-section-${i}`,
    cafeId,
    key: s.key,
    label: s.label,
    enabled: s.enabled,
    isSystem: false,
    sortOrder: s.sortOrder,
    parentKey: s.parentKey,
    posCategoryId: s.posCategoryId,
    kind: s.kind,
  }));
}
