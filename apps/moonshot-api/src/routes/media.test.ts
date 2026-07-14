import { Readable } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_VERSION_PREFIX } from '@moonshot/types';

const getMenuImageObject = vi.fn();

vi.mock('../lib/menu-image-storage.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/menu-image-storage.js')>(
    '../lib/menu-image-storage.js',
  );
  return {
    ...actual,
    getMenuImageObject: (...args: unknown[]) => getMenuImageObject(...args),
  };
});

describe('mediaRouter', () => {
  beforeEach(() => {
    getMenuImageObject.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  async function appWithMediaRouter() {
    const { mediaRouter } = await import('./media.js');
    const app = express();
    app.use(`${API_VERSION_PREFIX}/media`, mediaRouter);
    return app;
  }

  it('streams an allowed template image', async () => {
    const body = Buffer.from('RIFF....WEBP');
    getMenuImageObject.mockResolvedValue({
      body: Readable.from(body),
      contentType: 'image/webp',
      contentLength: body.length,
      cacheControl: 'public, max-age=31536000, immutable',
    });

    const app = await appWithMediaRouter();
    const res = await request(app).get(
      `${API_VERSION_PREFIX}/media/template/drinks/flat-white.webp`,
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/webp/);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(getMenuImageObject).toHaveBeenCalledWith('template/drinks/flat-white.webp');
    expect(Buffer.compare(res.body as Buffer, body)).toBe(0);
  });

  it('rejects disallowed object keys', async () => {
    const app = await appWithMediaRouter();
    const res = await request(app).get(`${API_VERSION_PREFIX}/media/secrets/key.webp`);
    expect(res.status).toBe(400);
    expect(getMenuImageObject).not.toHaveBeenCalled();
  });

  it('returns 404 when the object is missing', async () => {
    const { MenuImageNotFoundError } = await import('../lib/menu-image-storage.js');
    getMenuImageObject.mockRejectedValue(new MenuImageNotFoundError());

    const app = await appWithMediaRouter();
    const res = await request(app).get(
      `${API_VERSION_PREFIX}/media/template/drinks/flat-white.webp`,
    );
    expect(res.status).toBe(404);
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
