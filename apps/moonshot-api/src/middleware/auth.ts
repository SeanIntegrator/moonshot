import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiErrorCode, type JwtClaims } from '@moonshot/types';

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({
    ok: false,
    error: message,
    code: status === 401 ? ApiErrorCode.UNAUTHORIZED : ApiErrorCode.FORBIDDEN,
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    void fail(res, 401, 'Missing or invalid Authorization header');
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    void fail(res, 500, 'Server JWT configuration missing');
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, secret) as JwtClaims;
    req.user = payload;
    next();
  } catch {
    void fail(res, 401, 'Invalid or expired token');
  }
}

/** True if JWT subject email is allowed to mutate menu (Phase 1: env list). */
export function isMenuAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const raw = process.env.MENU_ADMIN_EMAILS ?? '';
  const allowed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
