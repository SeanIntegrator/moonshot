import type { Namespace, Server } from 'socket.io';
import type { KdsServerToClientEvent } from '@moonshot/types';

let kdsNs: Namespace | null = null;

export function attachKdsSocketIO(server: Server): void {
  kdsNs = server.of('/kds');
}

export function kdsCafeRoom(cafeId: string): string {
  return `kds:cafe:${cafeId}`;
}

/** Push KDS events to Socket.io clients in the café room. No-op until HTTP server attaches IO. */
export function emitKdsServerToClient(cafeId: string, event: KdsServerToClientEvent): void {
  if (!kdsNs) return;
  void kdsNs.to(kdsCafeRoom(cafeId)).emit('kds:event', event);
}
