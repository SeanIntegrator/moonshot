import type { KdsJwtClaims } from '@moonshot/types';

declare module 'socket.io' {
  interface SocketData {
    kdsUser?: KdsJwtClaims;
  }
}
