import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiErrorCode, type KdsJwtClaims } from '@moonshot/types';

function fail(res: Response, status: number, message: string, code: ApiErrorCode): void {
  void res.status(status).json({
    ok: false,
    error: message,
    code,
  });
}

function isKdsClaims(payload: unknown): payload is KdsJwtClaims {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    p.purpose === 'kds' &&
    typeof p.sub === 'string' &&
    typeof p.kdsUserId === 'string' &&
    typeof p.cafeId === 'string' &&
    typeof p.cafeSlug === 'string'
  );
}

export function requireKdsAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    fail(res, 401, 'Missing or invalid Authorization header', ApiErrorCode.UNAUTHORIZED);
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    fail(res, 500, 'Server JWT configuration missing', ApiErrorCode.CONFIG);
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, secret);
    if (!isKdsClaims(payload)) {
      fail(res, 401, 'Invalid KDS token', ApiErrorCode.UNAUTHORIZED);
      return;
    }
    req.kdsUser = payload;
    next();
  } catch {
    fail(res, 401, 'Invalid or expired token', ApiErrorCode.UNAUTHORIZED);
  }
}
