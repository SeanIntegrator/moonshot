/**
 * Fan-out after a successful menu catalogue sync: admin UI refresh + customer menu invalidation.
 */
import type { AdminCatalogSyncSource } from '@moonshot/types';
import { emitAdminMenuSynced } from '../../realtime/admin-events.js';
import { emitCustomerMenuUpdated } from '../../realtime/customer-events.js';

export function notifyMenuCatalogSynced(payload: {
  cafeId: string;
  syncedAt: string;
  upsertedItems: number;
  softDeletedItems: number;
  source: AdminCatalogSyncSource;
}): void {
  emitAdminMenuSynced(payload);
  emitCustomerMenuUpdated({ cafeId: payload.cafeId, syncedAt: payload.syncedAt });
}
