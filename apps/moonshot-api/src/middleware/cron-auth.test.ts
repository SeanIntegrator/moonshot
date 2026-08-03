import type { NextFunction, Request, Response } from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { reloadConfig } from '../lib/config.js';
import { requireCronSecret } from './cron-auth.js';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('requireCronSecret', () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
    reloadConfig();
  });

  it('rejects when CRON_SECRET is missing', () => {
    reloadConfig();
    const req = { headers: {} } as Request;
    const res = mockRes();
    let nextCalled = false;
    requireCronSecret(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(503);
  });

  it('rejects wrong bearer secret', () => {
    process.env.CRON_SECRET = 'correct-secret';
    reloadConfig();
    const req = { headers: { authorization: 'Bearer wrong' } } as Request;
    const res = mockRes();
    let nextCalled = false;
    requireCronSecret(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('accepts Bearer CRON_SECRET', () => {
    process.env.CRON_SECRET = 'correct-secret';
    reloadConfig();
    const req = { headers: { authorization: 'Bearer correct-secret' } } as Request;
    const res = mockRes();
    let nextCalled = false;
    requireCronSecret(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(true);
  });

  it('accepts X-Cron-Secret', () => {
    process.env.CRON_SECRET = 'correct-secret';
    reloadConfig();
    const req = { headers: { 'x-cron-secret': 'correct-secret' } } as Request;
    const res = mockRes();
    let nextCalled = false;
    requireCronSecret(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(true);
  });
});
