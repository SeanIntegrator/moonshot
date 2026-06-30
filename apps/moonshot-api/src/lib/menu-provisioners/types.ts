import type {
  MenuProvisionResult,
  MenuProvisionSource,
} from '@moonshot/types';
import type { PoolClient } from 'pg';

/** Strategy for creating a café's first menu during onboarding. */
export interface MenuProvisioner<TPayload = unknown> {
  readonly source: MenuProvisionSource;
  apply(client: PoolClient, cafeId: string, payload: TPayload): Promise<MenuProvisionResult>;
}
