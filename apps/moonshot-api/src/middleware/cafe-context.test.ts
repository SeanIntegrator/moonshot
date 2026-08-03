import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { requireCafeContext } from './cafe-context.js';

const findCafeBySlug = vi.hoisted(() => vi.fn());

vi.mock('../lib/cafes-repository.js', () => ({
  findCafeBySlug,
}));

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

describe('requireCafeContext', () => {
  afterEach(() => {
    findCafeBySlug.mockReset();
  });

  it('rejects when slug is missing', async () => {
    const req = { params: {}, headers: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await requireCafeContext(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect((res.body as { code?: string }).code).toBe('VALIDATION');
  });

  it('rejects unknown café slug', async () => {
    findCafeBySlug.mockResolvedValue(null);
    const req = {
      params: {},
      headers: { 'x-cafe-slug': 'missing-cafe' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await requireCafeContext(req, res, next);

    expect(findCafeBySlug).toHaveBeenCalledWith('missing-cafe');
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('attaches café and calls next when found via header', async () => {
    const cafe = { cafeId: 'cafe-1', slug: 'demo', name: 'Demo' };
    findCafeBySlug.mockResolvedValue(cafe);
    const req = {
      params: {},
      headers: { 'x-cafe-slug': 'demo' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await requireCafeContext(req, res, next);

    expect(req.cafe).toEqual(cafe);
    expect(next).toHaveBeenCalledOnce();
  });

  it('prefers route param over header', async () => {
    const cafe = { cafeId: 'cafe-2', slug: 'from-param', name: 'Param' };
    findCafeBySlug.mockResolvedValue(cafe);
    const req = {
      params: { slug: 'from-param' },
      headers: { 'x-cafe-slug': 'from-header' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await requireCafeContext(req, res, next);

    expect(findCafeBySlug).toHaveBeenCalledWith('from-param');
    expect(next).toHaveBeenCalledOnce();
  });

  it('forwards DB errors to next', async () => {
    const err = new Error('db down');
    findCafeBySlug.mockRejectedValue(err);
    const req = {
      params: {},
      headers: { 'x-cafe-slug': 'demo' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await requireCafeContext(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
