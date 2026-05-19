import { ApiErrorCode } from '@moonshot/types';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiHttpError } from '../lib/http-errors.js';
import { errorHandler } from './error-handler.js';

describe('errorHandler middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  function appWithThrow(throwFn: () => never): express.Express {
    const app = express();
    app.get('/boom', (_req, _res, _next) => {
      throwFn();
    });
    app.get('/async-boom', async (_req, _res, _next) => {
      throwFn();
    });
    app.use(errorHandler);
    return app;
  }

  it('serialises ApiHttpError with its own status, code, and message', async () => {
    const app = appWithThrow(() => {
      throw new ApiHttpError(409, ApiErrorCode.CONFLICT, 'Order cannot be cancelled');
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      ok: false,
      error: 'Order cannot be cancelled',
      code: ApiErrorCode.CONFLICT,
    });
  });

  it('serialises ApiHttpError thrown from async handlers in Express 5', async () => {
    const app = appWithThrow(() => {
      throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
    });

    const res = await request(app).get('/async-boom');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(ApiErrorCode.NOT_FOUND);
    expect(res.body.error).toBe('Café not found');
  });

  it('maps unknown errors to a generic Internal error 500 without leaking detail', async () => {
    const app = appWithThrow(() => {
      throw new Error('SELECT failed: column "foo" does not exist');
    });

    const res = await request(app).get('/async-boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      ok: false,
      error: 'Internal error',
      code: ApiErrorCode.INTERNAL,
    });
    expect(JSON.stringify(res.body)).not.toContain('column "foo"');
  });

  it('forwards to next(err) when headers were already sent (no double-write)', () => {
    const next = vi.fn();
    const status = vi.fn();
    const json = vi.fn();
    const req = {} as express.Request;
    const res = {
      headersSent: true,
      status,
      json,
    } as unknown as express.Response;
    const err = new Error('post-headers failure');

    errorHandler(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });
});
