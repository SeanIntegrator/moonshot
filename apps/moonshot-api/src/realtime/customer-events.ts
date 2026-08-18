import type { Namespace, Server } from 'socket.io';
import type { CustomerServerToClientEvent } from '@moonshot/types';

let customerNs: Namespace | null = null;

export function attachCustomerSocketIO(server: Server): void {
  customerNs = server.of('/customer');
}

export function customerOrderRoom(orderId: string): string {
  return `customer:order:${orderId}`;
}

export function customerCafeRoom(cafeId: string): string {
  return `customer:cafe:${cafeId}`;
}

/** Push customer tracking events to Socket.io subscribers for one order. */
export function emitCustomerServerToClient(
  orderId: string,
  event: CustomerServerToClientEvent,
): void {
  if (!customerNs) return;
  void customerNs.to(customerOrderRoom(orderId)).emit('customer:event', event);
}

/** Push café-scoped events (e.g. menu invalidation) to menu subscribers. */
export function emitCustomerCafeEvent(
  cafeId: string,
  event: CustomerServerToClientEvent,
): void {
  if (!customerNs) return;
  void customerNs.to(customerCafeRoom(cafeId)).emit('customer:event', event);
}

export function emitCustomerMenuUpdated(payload: {
  cafeId: string;
  syncedAt: string;
}): void {
  emitCustomerCafeEvent(payload.cafeId, {
    type: 'customerMenuUpdated',
    cafeId: payload.cafeId,
    syncedAt: payload.syncedAt,
  });
}

export function emitCustomerCafeUpdated(payload: {
  cafeId: string;
  updatedAt: string;
}): void {
  emitCustomerCafeEvent(payload.cafeId, {
    type: 'customerCafeUpdated',
    cafeId: payload.cafeId,
    updatedAt: payload.updatedAt,
  });
}
