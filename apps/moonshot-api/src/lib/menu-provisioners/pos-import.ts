import {
  MENU_PROVISION_SOURCES,
  type MenuProvisionResult,
  type PosMenuProvisionPayload,
} from '@moonshot/types';
import type { PoolClient } from 'pg';
import { MenuProvisionError } from './errors.js';
import type { MenuProvisioner } from './types.js';

/**
 * POS menu import provisioner — fetches via `PosAdapter.fetchMenu` and persists via
 * `persistNormalisedMenuCatalog` once provider OAuth is wired.
 */
export const posImportMenuProvisioner: MenuProvisioner<PosMenuProvisionPayload> = {
  source: MENU_PROVISION_SOURCES.pos,
  async apply(
    _client: PoolClient,
    _cafeId: string,
    _payload: PosMenuProvisionPayload,
  ): Promise<MenuProvisionResult> {
    throw new MenuProvisionError(
      'POS menu import is not available yet',
      501,
      'NOT_IMPLEMENTED',
    );
  },
};
