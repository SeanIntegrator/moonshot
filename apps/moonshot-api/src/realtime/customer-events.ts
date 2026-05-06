import type { Namespace, Server } from 'socket.io';
import type { CustomerServerToClientEvent } from '@moonshot/types';

let customerNs: Namespace | null = null;

export function attachCustomerSocketIO(server: Server): void {
  customerNs = server.of('/customer');
}

export function customerOrderRoom(orderId: string): string {
  return `customer:order:${orderId}`;
}

/** Push customer tracking events to Socket.io subscribers for one order. */
export function emitCustomerServerToClient(
  orderId: string,
  event: CustomerServerToClientEvent,
): void {
  if (!customerNs) return;
  void customerNs.to(customerOrderRoom(orderId)).emit('customer:event', event);
}
