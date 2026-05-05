import type { Server } from 'socket.io';
import type { KdsServerToClientEvent } from '@moonshot/types';

let io: Server | null = null;

export function attachKdsSocketIO(server: Server): void {
  io = server;
}

export function kdsCafeRoom(cafeId: string): string {
  return `kds:cafe:${cafeId}`;
}

/** Push KDS events to Socket.io clients in the café room. No-op until HTTP server attaches IO. */
export function emitKdsServerToClient(cafeId: string, event: KdsServerToClientEvent): void {
  if (!io) return;
  void io.to(kdsCafeRoom(cafeId)).emit('kds:event', event);
}
