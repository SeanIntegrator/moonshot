import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiErrorCode, type AdminJwtClaims } from '@moonshot/types';

function fail(res: Response, status: number, message: string, code: ApiErrorCode): void {
  void res.status(status).json({
    ok: false,
    error: message,
    code,
  });
}

export function isAdminClaims(payload: unknown): payload is AdminJwtClaims {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    p.purpose === 'admin' &&
    typeof p.sub === 'string' &&
    typeof p.adminUserId === 'string' &&
    typeof p.cafeId === 'string' &&
    typeof p.cafeSlug === 'string' &&
    typeof p.email === 'string'
  );
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
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
    if (!isAdminClaims(payload)) {
      fail(res, 401, 'Invalid admin token', ApiErrorCode.UNAUTHORIZED);
      return;
    }
    req.adminUser = payload;
    next();
  } catch {
    fail(res, 401, 'Invalid or expired token', ApiErrorCode.UNAUTHORIZED);
  }
}
