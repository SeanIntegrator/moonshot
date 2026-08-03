import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import { config } from '../lib/config.js';

/**
 * If `Authorization: Bearer` is absent, continues with `req.customerUserId` unset.
 * If present, must verify as a customer (Google session) JWT — rejects KDS tokens.
 */
export function optionalCustomerAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  const secret = config.jwtSecret;
  if (!secret) {
    res.status(500).json({
      ok: false,
      error: 'Server JWT configuration missing',
      code: ApiErrorCode.CONFIG,
    });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({
      ok: false,
      error: 'Missing bearer token',
      code: ApiErrorCode.UNAUTHORIZED,
    });
    return;
  }
  try {
    const payload = jwt.verify(token, secret) as Record<string, unknown>;
    if (payload.purpose === 'kds') {
      res.status(401).json({
        ok: false,
        error: 'KDS token cannot be used for customer routes',
        code: ApiErrorCode.UNAUTHORIZED,
      });
      return;
    }
    if (payload.purpose === 'track_order') {
      res.status(401).json({
        ok: false,
        error: 'Use order tracking token only for socket subscribe, not HTTP',
        code: ApiErrorCode.UNAUTHORIZED,
      });
      return;
    }
    const userId = typeof payload.userId === 'string' ? payload.userId : undefined;
    if (!userId) {
      res.status(401).json({
        ok: false,
        error: 'Invalid or expired token',
        code: ApiErrorCode.UNAUTHORIZED,
      });
      return;
    }
    req.customerUserId = userId;
    next();
  } catch {
    res.status(401).json({
      ok: false,
      error: 'Invalid or expired token',
      code: ApiErrorCode.UNAUTHORIZED,
    });
  }
}
