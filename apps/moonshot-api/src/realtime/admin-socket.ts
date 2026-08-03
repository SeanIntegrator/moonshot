import type { AdminJwtClaims } from '@moonshot/types';
import jwt from 'jsonwebtoken';
import type { Server } from 'socket.io';
import { adminCafeRoom } from './admin-events.js';

function isAdminClaims(payload: unknown): payload is AdminJwtClaims {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    p.purpose === 'admin' &&
    typeof p.sub === 'string' &&
    typeof p.adminUserId === 'string' &&
    typeof p.cafeId === 'string' &&
    typeof p.cafeSlug === 'string'
  );
}

export function registerAdminSocketHandlers(io: Server): void {
  const ns = io.of('/admin');

  ns.use((socket, next) => {
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
      if (!isAdminClaims(payload)) {
        next(new Error('Unauthorized'));
        return;
      }
      socket.data.adminUser = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  ns.on('connection', (socket) => {
    const claims = socket.data.adminUser as AdminJwtClaims | undefined;
    if (!claims) {
      socket.disconnect(true);
      return;
    }
    void socket.join(adminCafeRoom(claims.cafeId));
  });
}
