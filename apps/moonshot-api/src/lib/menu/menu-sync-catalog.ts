/**
 * Ongoing sync wrapper — upsert POS catalogue deltas into Postgres.
 * Shared write path: pos-catalog/menu-catalog-upsert.ts
 */

import type { PoolClient } from 'pg';
import type { PosCatalog } from '@moonshot/domain';
import {
  upsertPosCatalog,
  type CatalogUpsertResult,
} from '../pos-catalog/menu-catalog-upsert.js';

export type SyncCatalogResult = {
  upsertedItems: number;
  softDeletedItems: number;
  upsertedGroups: number;
};

/**
 * Upsert Square/POS catalogue deltas.
 * POS owns name/price/category/sizes/modifier lists/images/availability;
 * Moonshot Flow prep attachments survive only when archetype is set.
 */
export async function syncNormalisedMenuCatalog(
  client: PoolClient,
  cafeId: string,
  catalog: PosCatalog,
  _opts?: { deletedPosItemIds?: string[]; groupsByPosId?: PosCatalog['groupsByPosId']; roleHints?: Map<string, string> },
): Promise<SyncCatalogResult> {
  // Merge legacy opts.deletedPosItemIds when callers pass the old signature.
  const full: PosCatalog = {
    ...catalog,
    deletedPosItemIds:
      _opts?.deletedPosItemIds ?? catalog.deletedPosItemIds ?? [],
    groupsByPosId: _opts?.groupsByPosId ?? catalog.groupsByPosId,
  };

  const result: CatalogUpsertResult = await upsertPosCatalog(
    client,
    cafeId,
    full,
    'sync',
  );
  return {
    upsertedItems: result.upsertedItems,
    softDeletedItems: result.softDeletedItems,
    upsertedGroups: result.upsertedGroups,
  };
}
