import type { ServerOptions } from 'socket.io';

/**
 * Engine.IO + Socket.IO options shared by `/kds`, `/customer`, and `/admin`.
 *
 * pingTimeout is raised (not lowered) on purpose: the failure mode is a
 * suspended timer on a sleeping kitchen tablet, not a genuinely dead peer.
 * Worst-case dead-socket detection is pingInterval + pingTimeout ≈ 60s.
 *
 * connectionStateRecovery uses SessionAwareAdapter (in-memory). The classic
 * `@socket.io/redis-adapter` does not support recovery — a Redis Streams
 * adapter is required before multi-instance. skipMiddlewares is false so a
 * recovered handshake still re-verifies the JWT.
 */
export const SOCKET_SERVER_OPTIONS = {
  pingInterval: 20_000,
  pingTimeout: 40_000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
} as const satisfies Partial<ServerOptions>;
