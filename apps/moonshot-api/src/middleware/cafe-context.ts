import type { NextFunction, Request, Response } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import { pool } from '../db.js';
import { mapCafeRow } from '../lib/cafe-map.js';

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
    const { rows } = await pool.query(
      `SELECT
        id, name, slug, pos_provider, pos_config, payment_provider, payment_config,
        features, theme_id, theme_overrides, kds_config, timezone, owner_feedback_email
      FROM cafes
      WHERE slug = $1`,
      [slug.trim()],
    );
    if (rows.length === 0) {
      void fail(res, 404, 'Café not found', ApiErrorCode.NOT_FOUND);
      return;
    }
    req.cafe = mapCafeRow(rows[0] as Parameters<typeof mapCafeRow>[0]);
    next();
  } catch (e) {
    console.error(e);
    void fail(res, 500, 'Database error', ApiErrorCode.INTERNAL);
  }
}
