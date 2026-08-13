import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RealtimeConnection, type RealtimeStatus } from './connection.js';

function listen(httpServer: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      const addr = httpServer.address();
      resolve(typeof addr === 'object' && addr ? addr.port : 0);
    });
  });
}

function waitForStatus(
  statuses: RealtimeStatus[],
  wanted: RealtimeStatus,
  timeoutMs = 8_000,
): Promise<void> {
  if (statuses.at(-1) === wanted) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const id = setInterval(() => {
      if (statuses.at(-1) === wanted) {
        clearInterval(id);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(id);
        reject(new Error(`timed out waiting for ${wanted}; saw ${statuses.join(' → ')}`));
      }
    }, 20);
  });
}

describe('RealtimeConnection', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let port: number;
  let conn: RealtimeConnection | null;

  beforeEach(async () => {
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: { origin: true },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: false,
      },
    });
    port = await listen(httpServer);
    conn = null;
  });

  afterEach(async () => {
    conn?.destroy();
    conn = null;
    io.close();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('transitions idle → connecting → connected', async () => {
    const ns = io.of('/kds');
    ns.on('connection', (socket) => {
      void socket.join('kds:cafe:1');
    });

    const statuses: RealtimeStatus[] = [];
    conn = new RealtimeConnection({
      baseUrl: `http://127.0.0.1:${port}`,
      namespace: '/kds',
      resumeOnVisibility: false,
      onStatusChange: (s) => statuses.push(s),
    });
    expect(conn.status).toBe('idle');
    conn.connect();
    await waitForStatus(statuses, 'connected');
    expect(statuses[0]).toBe('connecting');
    expect(conn.connected).toBe(true);
  });

  it('sets unauthorized on middleware rejection and does not retry', async () => {
    const ns = io.of('/kds');
    ns.use((_socket, next) => {
      next(new Error('Unauthorized'));
    });

    const statuses: RealtimeStatus[] = [];
    let authErrors = 0;
    conn = new RealtimeConnection({
      baseUrl: `http://127.0.0.1:${port}`,
      namespace: '/kds',
      auth: () => ({ token: 'bad' }),
      resumeOnVisibility: false,
      onStatusChange: (s) => statuses.push(s),
      onAuthError: () => {
        authErrors += 1;
      },
    });
    conn.connect();
    await waitForStatus(statuses, 'unauthorized');
    expect(authErrors).toBe(1);

    await new Promise((r) => setTimeout(r, 400));
    expect(statuses.filter((s) => s === 'unauthorized')).toHaveLength(1);
    expect(conn.connected).toBe(false);
  });

  it('reconnects after a transport drop and reports recovered', async () => {
    const ns = io.of('/kds');
    ns.on('connection', (socket) => {
      void socket.join('room-a');
      socket.emit('kds:event', { type: 'seed' });
    });

    const statuses: RealtimeStatus[] = [];
    const connects: Array<{ recovered: boolean; isReconnect: boolean }> = [];
    conn = new RealtimeConnection({
      baseUrl: `http://127.0.0.1:${port}`,
      namespace: '/kds',
      resumeOnVisibility: false,
      onStatusChange: (s) => statuses.push(s),
      onConnect: (ctx) => connects.push(ctx),
    });
    conn.connect();
    await waitForStatus(statuses, 'connected');
    expect(connects[0]).toEqual({ recovered: false, isReconnect: false });

    // Offset is only stored after a packet with recovery metadata arrives.
    await new Promise((r) => setTimeout(r, 50));
    conn.dropTransport();

    await waitForStatus(statuses, 'reconnecting');
    await waitForStatus(statuses, 'connected');
    const last = connects.at(-1);
    expect(last?.isReconnect).toBe(true);
    expect(last?.recovered).toBe(true);
  }, 10_000);

  it('replays a packet emitted during a recovered disconnect', async () => {
    const ns = io.of('/kds');
    ns.on('connection', (socket) => {
      void socket.join('room-a');
      if (!socket.recovered) {
        socket.emit('kds:event', { type: 'seed' });
      }
    });

    const received: unknown[] = [];
    conn = new RealtimeConnection({
      baseUrl: `http://127.0.0.1:${port}`,
      namespace: '/kds',
      resumeOnVisibility: false,
    });
    conn.on('kds:event', (...args) => {
      received.push(args[0]);
    });
    conn.connect();

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('initial connect timeout')), 8_000);
      const check = setInterval(() => {
        if (conn?.connected) {
          clearInterval(check);
          clearTimeout(t);
          resolve();
        }
      }, 20);
    });
    await new Promise((r) => setTimeout(r, 50));

    conn.dropTransport();
    await new Promise((r) => setTimeout(r, 50));
    ns.to('room-a').emit('kds:event', { type: 'kds:order:removed', orderId: 'missed' });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('did not receive recovered packet')), 8_000);
      const check = setInterval(() => {
        if (received.some((e) => (e as { orderId?: string }).orderId === 'missed')) {
          clearInterval(check);
          clearTimeout(t);
          resolve();
        }
      }, 20);
    });
  }, 10_000);
});
