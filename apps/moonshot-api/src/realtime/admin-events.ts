import type { Namespace, Server } from 'socket.io';
import type { AdminServerToClientEvent } from '@moonshot/types';

let adminNs: Namespace | null = null;

export function attachAdminSocketIO(server: Server): void {
  adminNs = server.of('/admin');
}

export function adminCafeRoom(cafeId: string): string {
  return `admin:cafe:${cafeId}`;
}

export function emitAdminServerToClient(
  cafeId: string,
  event: AdminServerToClientEvent,
): void {
  if (!adminNs) return;
  void adminNs.to(adminCafeRoom(cafeId)).emit('admin:event', event);
}

export function emitAdminMenuSynced(
  payload: Omit<Extract<AdminServerToClientEvent, { type: 'admin:menu:synced' }>, 'type'>,
): void {
  emitAdminServerToClient(payload.cafeId, { type: 'admin:menu:synced', ...payload });
}
