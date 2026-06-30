import type { NormalisedMenu } from '@moonshot/types';
import type { PoolClient } from 'pg';
import type { MenuProvisionResult } from '@moonshot/types';

/**
 * Persists a provider-agnostic `NormalisedMenu` into `menu_items` and `modifier_groups`.
 *
 * Intended flow for POS import:
 *   PosAdapter.fetchMenu(cafeId) → NormalisedMenu → persistNormalisedMenuCatalog(...)
 *
 * Template onboarding currently uses `applyMenuTemplate` directly; both paths should
 * converge here when POS import ships.
 */
export async function persistNormalisedMenuCatalog(
  _client: PoolClient,
  _cafeId: string,
  _menu: NormalisedMenu,
): Promise<MenuProvisionResult> {
  throw new Error(
    'persistNormalisedMenuCatalog is not implemented — use the template provisioner for manual onboarding',
  );
}
