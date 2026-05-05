import type { KdsJwtClaims } from '@moonshot/types';
import jwt from 'jsonwebtoken';
import type { Server } from 'socket.io';
import { kdsCafeRoom } from './kds-events.js';

function isKdsClaims(payload: unknown): payload is KdsJwtClaims {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    p.purpose === 'kds' &&
    typeof p.sub === 'string' &&
    typeof p.kdsUserId === 'string' &&
    typeof p.cafeId === 'string' &&
    typeof p.cafeSlug === 'string'
  );
}

export function registerKdsSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    const tokenRaw = socket.handshake.auth;
    const token =
      tokenRaw &&
      typeof tokenRaw === 'object' &&
      'token' in tokenRaw &&
      typeof (tokenRaw as { token?: unknown }).token === 'string'
        ? (tokenRaw as { token: string }).token
        : undefined;
    if (!token?.trim()) {
      next(new Error('Unauthorized'));
      return;
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      next(new Error('CONFIG'));
      return;
    }
    try {
      const payload = jwt.verify(token, secret);
      if (!isKdsClaims(payload)) {
        next(new Error('Unauthorized'));
        return;
      }
      socket.data.kdsUser = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const claims = socket.data.kdsUser;
    if (!claims) {
      socket.disconnect(true);
      return;
    }
    void socket.join(kdsCafeRoom(claims.cafeId));
  });
}
