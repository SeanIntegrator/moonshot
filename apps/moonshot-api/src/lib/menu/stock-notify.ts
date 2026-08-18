/**
 * Fan-out after option or food availability changes: customer menu refetch + KDS grey chips.
 */
import { emitCustomerMenuUpdated } from '../../realtime/customer-events.js';
import { emitKdsServerToClient } from '../../realtime/kds-events.js';

export function notifyStockChanged(payload: {
  cafeId: string;
  outOptionIds: string[];
}): void {
  const syncedAt = new Date().toISOString();
  emitCustomerMenuUpdated({ cafeId: payload.cafeId, syncedAt });
  emitKdsServerToClient(payload.cafeId, {
    type: 'kds:stock:updated',
    cafeId: payload.cafeId,
    outOptionIds: payload.outOptionIds,
  });
}
