import type { NextFunction, Request, Response } from 'express';
import { ApiErrorCode } from '@moonshot/types';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Railway's public edge overwrites this with the connecting client and does
 * not give Express a stable `trust proxy` hop count. `req.ip` is therefore
 * the proxy for every caller, which collapses a per-IP limit into one bucket.
 */
const REAL_IP_HEADER = 'x-real-ip';
/** IPv6 text form is 45 characters; cap the key so a junk header cannot grow the map. */
const MAX_CLIENT_IP_LENGTH = 64;

/** Simple in-memory rate limiter — sufficient for single-instance Railway deploys. */
export function createRateLimiter(options: { windowMs: number; max: number; keyPrefix?: string }) {
  const { windowMs, max, keyPrefix = '' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = clientIp(req);
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

function clientIp(req: Request): string {
  const fromEdge = realClientIp(req.headers[REAL_IP_HEADER]);
  if (fromEdge) return fromEdge;
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function realClientIp(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const ip = raw?.split(',')[0]?.trim();
  if (!ip || ip.length > MAX_CLIENT_IP_LENGTH) return undefined;
  // Only bucket on an IP-shaped value. Anything else falls back to the socket.
  if (!/^[0-9a-fA-F:.]+$/.test(ip)) return undefined;
  return ip;
}
