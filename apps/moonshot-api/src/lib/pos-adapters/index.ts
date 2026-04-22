import type { PosAdapter } from '@moonshot/types';
import { POS_PROVIDERS, type PosProvider } from '@moonshot/types';
import { manualPosAdapter } from './manual.js';

export function getPosAdapter(provider: PosProvider): PosAdapter {
  switch (provider) {
    case POS_PROVIDERS.manual:
      return manualPosAdapter;
    case POS_PROVIDERS.square:
    case POS_PROVIDERS.epos_now:
    case POS_PROVIDERS.sumup:
    case POS_PROVIDERS.lightspeed:
    case POS_PROVIDERS.whatsapp_n8n:
      throw new Error(`POS adapter not implemented: ${provider}`);
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown POS provider: ${_exhaustive}`);
    }
  }
}
