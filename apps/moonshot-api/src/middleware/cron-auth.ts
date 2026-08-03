import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { ApiErrorCode } from '@moonshot/types';
import { config } from '../lib/config.js';

function fail(res: Response, status: number, message: string): void {
  void res.status(status).json({
    ok: false,
    error: message,
    code: ApiErrorCode.UNAUTHORIZED,
  });
}

function extractCronSecret(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  const alt = req.headers['x-cron-secret'];
  if (typeof alt === 'string' && alt.trim()) return alt.trim();
  return null;
}

function secretsEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Auth for Railway cron / internal jobs — Bearer CRON_SECRET or X-Cron-Secret.
 * Not admin JWT.
 */
export function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const expected = config.cronSecret;
  if (!expected) {
    void res.status(503).json({
      ok: false,
      error: 'CRON_SECRET is not configured',
      code: ApiErrorCode.CONFIG,
    });
    return;
  }

  const provided = extractCronSecret(req);
  if (!provided || !secretsEqual(provided, expected)) {
    fail(res, 401, 'Missing or invalid cron secret');
    return;
  }
  next();
}
