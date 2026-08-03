/**
 * Onboarding wrapper — persist a POS catalogue into an empty café menu.
 * Shared write path: pos-catalog/menu-catalog-upsert.ts
 */

import type { PoolClient } from 'pg';
import type { MenuProvisionResult, PosCatalog } from '@moonshot/types';
import {
  toMenuProvisionResult,
  upsertModifierGroup,
  upsertPosCatalog,
  syncKdsModifierClassification,
  type CatalogUpsertResult,
} from './pos-catalog/menu-catalog-upsert.js';

export {
  upsertModifierGroup,
  syncKdsModifierClassification,
};

/** @deprecated Prefer PosCatalog; kept for callers still passing split opts. */
export type PersistCatalogOptions = {
  groupsByPosId: PosCatalog['groupsByPosId'];
  roleHints?: Map<string, string>;
};

/**
 * Persist a normalised POS catalogue for onboarding (empty menu only).
 */
export async function persistNormalisedMenuCatalog(
  client: PoolClient,
  cafeId: string,
  catalog: PosCatalog,
  _opts?: PersistCatalogOptions,
): Promise<MenuProvisionResult> {
  // Allow legacy callers that pass menu + separate groups — prefer PosCatalog.
  const full: PosCatalog =
    'groupsByPosId' in catalog && catalog.groupsByPosId instanceof Map
      ? catalog
      : catalog;

  const result = await upsertPosCatalog(client, cafeId, full, 'onboarding');
  return toMenuProvisionResult(result);
}

/** Sync-shaped alias used by tests. */
export async function persistPosCatalogForOnboarding(
  client: PoolClient,
  cafeId: string,
  catalog: PosCatalog,
): Promise<CatalogUpsertResult> {
  return upsertPosCatalog(client, cafeId, catalog, 'onboarding');
}
