import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
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
  });

  afterEach(() => {
    if (stash.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = stash.NODE_ENV;
    if (stash.CORS_ORIGINS === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = stash.CORS_ORIGINS;
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
