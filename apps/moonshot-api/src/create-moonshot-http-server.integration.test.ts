import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { reloadConfig } from './lib/config.js';
import { createMoonshotHttpServer } from './create-moonshot-http-server.js';

describe('Express CORS with allowlist', () => {
  const stash = {
    NODE_ENV: undefined as string | undefined,
    CORS_ORIGINS: undefined as string | undefined,
  };

  const allowedOrigin = 'https://moonshotorder-ahead-production.up.railway.app';

  beforeEach(() => {
    stash.NODE_ENV = process.env.NODE_ENV;
    stash.CORS_ORIGINS = process.env.CORS_ORIGINS;
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS =
      'https://moonshotorder-ahead-production.up.railway.app,https://moonshot-kds-production.up.railway.app';
    // JWT required in production by loadConfig — use a dummy for this CORS-only suite.
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'cors-integration-test-secret';
    if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgres://localhost/moonshot_test';
    reloadConfig();
  });

  afterEach(() => {
    if (stash.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = stash.NODE_ENV;
    if (stash.CORS_ORIGINS === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = stash.CORS_ORIGINS;
    reloadConfig();
  });

  it('reflects allowlisted Origin on health', async () => {
    const { app } = createMoonshotHttpServer();
    const res = await request(app).get('/health').set('Origin', allowedOrigin);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('denies unknown Origin without turning the request into a 500', async () => {
    const { app } = createMoonshotHttpServer();
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
