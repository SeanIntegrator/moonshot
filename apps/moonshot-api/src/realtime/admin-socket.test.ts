import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { registerAdminSocketHandlers } from './admin-socket.js';
import { attachAdminSocketIO, adminCafeRoom } from './admin-events.js';

const SECRET = 'test-jwt-secret-for-admin-socket';

function signAdmin(cafeId = 'cafe-1') {
  return jwt.sign(
    {
      sub: 'admin-1',
      adminUserId: 'admin-1',
      cafeId,
      cafeSlug: 'test-cafe',
      email: 'a@b.c',
      purpose: 'admin',
    },
    SECRET,
    { expiresIn: '1h' },
  );
}

function signKds() {
  return jwt.sign(
    {
      sub: 'kds-1',
      kdsUserId: 'kds-1',
      cafeId: 'cafe-1',
      cafeSlug: 'test-cafe',
      purpose: 'kds',
    },
    SECRET,
    { expiresIn: '1h' },
  );
}

describe('admin socket auth', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let port: number;

  beforeEach(async () => {
    process.env.JWT_SECRET = SECRET;
    httpServer = createServer();
    io = new Server(httpServer);
    attachAdminSocketIO(io);
    registerAdminSocketHandlers(io);
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

  it('rejects KDS tokens on /admin namespace', async () => {
    const client: ClientSocket = ioc(`http://127.0.0.1:${port}/admin`, {
      auth: { token: signKds() },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', (e) => resolve(e));
    });
    expect(err.message).toMatch(/Unauthorized|xhr poll error|websocket error/i);
    client.close();
  });

  it('joins admin:cafe:{cafeId} after admin JWT handshake', async () => {
    const client: ClientSocket = ioc(`http://127.0.0.1:${port}/admin`, {
      auth: { token: signAdmin('cafe-42') },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', reject);
    });

    const sockets = await io.of('/admin').fetchSockets();
    expect(sockets.length).toBe(1);
    expect([...sockets[0]!.rooms]).toContain(adminCafeRoom('cafe-42'));
    client.close();
  });
});
