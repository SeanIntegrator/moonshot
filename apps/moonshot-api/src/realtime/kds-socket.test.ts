import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { registerKdsSocketHandlers } from './kds-socket.js';
import { attachKdsSocketIO, emitKdsServerToClient, kdsCafeRoom } from './kds-events.js';
import { SOCKET_SERVER_OPTIONS } from './socket-server-options.js';

const SECRET = 'test-jwt-secret-for-kds-socket';

function signKds(cafeId = 'cafe-1', expiresIn: string | number = '1h') {
  return jwt.sign(
    {
      sub: 'kds-1',
      kdsUserId: 'kds-1',
      cafeId,
      cafeSlug: 'test-cafe',
      purpose: 'kds',
    },
    SECRET,
    { expiresIn },
  );
}

function signAdmin() {
  return jwt.sign(
    {
      sub: 'admin-1',
      adminUserId: 'admin-1',
      cafeId: 'cafe-1',
      cafeSlug: 'test-cafe',
      email: 'a@b.c',
      purpose: 'admin',
    },
    SECRET,
    { expiresIn: '1h' },
  );
}

function connectClient(port: number, token?: string): ClientSocket {
  return ioc(`http://127.0.0.1:${port}/kds`, {
    auth: token !== undefined ? { token } : {},
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
}

describe('kds socket auth', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let port: number;

  beforeEach(async () => {
    process.env.JWT_SECRET = SECRET;
    httpServer = createServer();
    io = new Server(httpServer, { ...SOCKET_SERVER_OPTIONS });
    attachKdsSocketIO(io);
    registerKdsSocketHandlers(io);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterEach(async () => {
    io.close();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('rejects a missing token', async () => {
    const client = connectClient(port);
    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', (e) => resolve(e));
    });
    expect(err.message).toMatch(/Unauthorized|xhr poll error|websocket error/i);
    client.close();
  });

  it('rejects a non-KDS-purpose token', async () => {
    const client = connectClient(port, signAdmin());
    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', (e) => resolve(e));
    });
    expect(err.message).toMatch(/Unauthorized|xhr poll error|websocket error/i);
    client.close();
  });

  it('rejects an expired token', async () => {
    const client = connectClient(port, signKds('cafe-1', '-1s'));
    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', (e) => resolve(e));
    });
    expect(err.message).toMatch(/Unauthorized|xhr poll error|websocket error/i);
    client.close();
  });

  it('joins kds:cafe:{cafeId} after a valid KDS JWT handshake', async () => {
    const client = connectClient(port, signKds('cafe-42'));
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', reject);
    });

    const sockets = await io.of('/kds').fetchSockets();
    expect(sockets.length).toBe(1);
    expect([...sockets[0]!.rooms]).toContain(kdsCafeRoom('cafe-42'));
    client.close();
  });

  it('replays a packet emitted during a recovered disconnect', async () => {
    const token = signKds('cafe-7');
    const client = ioc(`http://127.0.0.1:${port}/kds`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', reject);
    });
    expect(client.recovered).toBe(false);

    const received: unknown[] = [];
    client.on('kds:event', (ev) => received.push(ev));
    emitKdsServerToClient('cafe-7', { type: 'kds:order:removed', orderId: 'seed' });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('seed packet not received')), 8_000);
      const check = setInterval(() => {
        if (received.some((e) => (e as { orderId?: string }).orderId === 'seed')) {
          clearInterval(check);
          clearTimeout(t);
          resolve();
        }
      }, 20);
    });

    client.io.engine.close();
    await new Promise((r) => setTimeout(r, 80));
    emitKdsServerToClient('cafe-7', { type: 'kds:order:removed', orderId: 'missed-1' });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('recovered packet not received')), 8_000);
      const check = setInterval(() => {
        if (received.some((e) => (e as { orderId?: string }).orderId === 'missed-1')) {
          clearInterval(check);
          clearTimeout(t);
          resolve();
        }
      }, 20);
    });

    expect(client.recovered).toBe(true);
    const sockets = await io.of('/kds').fetchSockets();
    expect([...sockets[0]!.rooms]).toContain(kdsCafeRoom('cafe-7'));
    client.close();
  });
});
