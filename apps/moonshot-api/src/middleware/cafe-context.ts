import type { NextFunction, Request, Response } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import { findCafeBySlug } from '../lib/cafes-repository.js';

function fail(res: Response, status: number, message: string, code?: string) {
  return res.status(status).json({
    ok: false,
    error: message,
    code: code ?? ApiErrorCode.NOT_FOUND,
  });
}

/**
 * Resolves café from `X-Cafe-Slug` header or optional `slug` route param.
 * Use after routes that include `:slug` — param wins when present.
 *
 * Unknown DB failures forward to the global error handler so the response
 * shape stays consistent (`Internal error` 500 envelope).
 */
export async function requireCafeContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  const slug =
    (typeof req.params.slug === 'string' && req.params.slug) ||
    (typeof req.headers['x-cafe-slug'] === 'string' ? req.headers['x-cafe-slug'] : undefined);

  if (!slug?.trim()) {
    void fail(res, 400, 'Missing café slug (path or X-Cafe-Slug header)', ApiErrorCode.VALIDATION);
    return;
  }

  try {
    const cafe = await findCafeBySlug(slug);
    if (!cafe) {
      void fail(res, 404, 'Café not found', ApiErrorCode.NOT_FOUND);
      return;
    }
    req.cafe = cafe;
    next();
  } catch (e) {
    next(e);
  }
}
