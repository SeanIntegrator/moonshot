import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { reloadConfig } from '../lib/config.js';
import { requireAuth } from './auth.js';

const SECRET = 'auth-middleware-test-secret';

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

describe('requireAuth', () => {
  const stash: { JWT_SECRET?: string } = {};

  beforeEach(() => {
    stash.JWT_SECRET = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    reloadConfig();
  });

  afterEach(() => {
    if (stash.JWT_SECRET === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = stash.JWT_SECRET;
    reloadConfig();
  });

  it('rejects missing Authorization header', () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    let nextCalled = false;
    requireAuth(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('rejects KDS-purpose tokens on customer routes', () => {
    const token = jwt.sign(
      { sub: 'k1', kdsUserId: 'k1', cafeId: 'c1', cafeSlug: 'demo', purpose: 'kds' },
      SECRET,
    );
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    let nextCalled = false;
    requireAuth(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('accepts a customer JWT and sets req.user', () => {
    const token = jwt.sign({ sub: 'u1', userId: 'u1', email: 'a@b.co' }, SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    let nextCalled = false;
    requireAuth(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(true);
    expect(req.user?.userId).toBe('u1');
  });
});
