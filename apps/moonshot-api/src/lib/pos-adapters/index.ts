import type { Pool } from 'pg';
import type { PosAdapter } from '@moonshot/types';
import { POS_PROVIDERS, type PosProvider } from '@moonshot/types';
import { getPosConnection } from '../pos-connections-repository.js';
import { resolveSquareEnvironment } from '../square/oauth-urls.js';
import { manualPosAdapter } from './manual.js';
import { createSquarePosAdapter } from './square/index.js';

/**
 * Returns a café-scoped POS adapter. `posConfig` is reserved for provider credentials
 * (legacy); prefer {@link getPosAdapterForCafe} for Square which loads encrypted tokens.
 */
export function getPosAdapter(
  provider: PosProvider,
  _posConfig?: Record<string, unknown>,
): PosAdapter {
  void _posConfig;
  switch (provider) {
    case POS_PROVIDERS.manual:
      return manualPosAdapter;
    case POS_PROVIDERS.square:
    case POS_PROVIDERS.epos_now:
    case POS_PROVIDERS.sumup:
    case POS_PROVIDERS.lightspeed:
    case POS_PROVIDERS.whatsapp_n8n:
      throw new Error(
        `POS adapter not implemented synchronously for ${provider} — use getPosAdapterForCafe`,
      );
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown POS provider: ${_exhaustive}`);
    }
  }
}

/**
 * Async resolver that loads decrypted POS credentials for Square cafés.
 * Customer menu reads must NOT go through this — use fetchMenuForCafe instead.
 */
export async function getPosAdapterForCafe(
  pool: Pool,
  cafeId: string,
  provider: PosProvider,
): Promise<PosAdapter> {
  if (provider === POS_PROVIDERS.manual) {
    return manualPosAdapter;
  }
  if (provider === POS_PROVIDERS.square) {
    const conn = await getPosConnection(pool, cafeId, POS_PROVIDERS.square);
    if (!conn || conn.status !== 'active') {
      throw new Error('Square is not connected for this café');
    }
    return createSquarePosAdapter({
      cafeId,
      accessToken: conn.accessToken,
      locationId: conn.locationId,
      environment: resolveSquareEnvironment(),
    });
  }
  throw new Error(`POS adapter not implemented: ${provider}`);
}
