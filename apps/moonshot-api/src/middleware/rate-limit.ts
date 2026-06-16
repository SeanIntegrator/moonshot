import type { NextFunction, Request, Response } from 'express';
import { ApiErrorCode } from '@moonshot/types';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Simple in-memory rate limiter — sufficient for single-instance Railway deploys. */
export function createRateLimiter(options: { windowMs: number; max: number; keyPrefix?: string }) {
  const { windowMs, max, keyPrefix = '' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || now >= existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= max) {
      void res.status(429).json({
        ok: false,
        error: 'Too many requests — try again in a few minutes',
        code: ApiErrorCode.RATE_LIMITED,
      });
      return;
    }

    existing.count += 1;
    next();
  };
}
