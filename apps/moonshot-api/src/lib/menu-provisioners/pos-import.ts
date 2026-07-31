import {
  MENU_PROVISION_SOURCES,
  POS_PROVIDERS,
  type MenuProvisionResult,
  type PosMenuProvisionPayload,
} from '@moonshot/types';
import type { PoolClient } from 'pg';
import { persistNormalisedMenuCatalog } from '../menu-persist-catalog.js';
import {
  getPosConnection,
  updatePosConnectionLocation,
} from '../pos-connections-repository.js';
import { createSquarePosAdapter } from '../pos-adapters/square/index.js';
import { resolveSquareEnvironment } from '../square/oauth-urls.js';
import { MenuProvisionError } from './errors.js';
import type { MenuProvisioner } from './types.js';

/**
 * POS menu import — fetches via Square Catalog API and persists via
 * `persistNormalisedMenuCatalog`. Requires an active OAuth connection.
 */
export const posImportMenuProvisioner: MenuProvisioner<PosMenuProvisionPayload> = {
  source: MENU_PROVISION_SOURCES.pos,
  async apply(
    client: PoolClient,
    cafeId: string,
    payload: PosMenuProvisionPayload,
  ): Promise<MenuProvisionResult> {
    if (payload.provider !== POS_PROVIDERS.square) {
      throw new MenuProvisionError(
        `POS provider not supported for import: ${payload.provider}`,
        501,
        'NOT_IMPLEMENTED',
      );
    }

    const conn = await getPosConnection(client, cafeId, POS_PROVIDERS.square);
    if (!conn || conn.status !== 'active') {
      throw new MenuProvisionError(
        'Connect Square before importing your menu',
        400,
        'VALIDATION',
      );
    }

    if (payload.locationId) {
      await updatePosConnectionLocation(
        client,
        cafeId,
        POS_PROVIDERS.square,
        payload.locationId,
      );
    }

    const adapter = createSquarePosAdapter({
      cafeId,
      accessToken: conn.accessToken,
      locationId: payload.locationId ?? conn.locationId,
      environment: resolveSquareEnvironment(),
    });

    let menu;
    try {
      menu = await adapter.fetchMenu(cafeId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Square Catalog fetch failed';
      throw new MenuProvisionError(message, 502, 'VALIDATION');
    }

    return persistNormalisedMenuCatalog(client, cafeId, menu, {
      groupsByPosId: adapter.lastGroupsByPosId,
      roleHints: adapter.lastRoleHints,
    });
  },
};
