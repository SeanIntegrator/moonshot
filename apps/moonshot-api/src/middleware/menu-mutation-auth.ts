import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiErrorCode, type JwtClaims } from '@moonshot/types';
import { config } from '../lib/config.js';
import { isMenuAdminEmail } from './auth.js';
import { isAdminClaims } from './admin-auth.js';

function fail(res: Response, status: number, message: string, code: ApiErrorCode): void {
  void res.status(status).json({
    ok: false,
    error: message,
    code,
  });
}

/**
 * After `requireCafeContext`: allows café-scoped admin JWT, or Google session JWT when email is in MENU_ADMIN_EMAILS.
 */
export function requireMenuMutationAuth(req: Request, res: Response, next: NextFunction): void {
  const cafeId = req.cafe?.cafeId;
  if (!cafeId) {
    fail(res, 500, 'Missing café context', ApiErrorCode.INTERNAL);
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    fail(res, 401, 'Missing or invalid Authorization header', ApiErrorCode.UNAUTHORIZED);
    return;
  }
  const secret = config.jwtSecret;
  if (!secret) {
    fail(res, 500, 'Server JWT configuration missing', ApiErrorCode.CONFIG);
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, secret) as unknown;
    if (typeof payload === 'object' && payload !== null && (payload as { purpose?: string }).purpose === 'kds') {
      fail(res, 401, 'Invalid token for this route', ApiErrorCode.UNAUTHORIZED);
      return;
    }
    if (isAdminClaims(payload)) {
      if (payload.cafeId !== cafeId) {
        fail(res, 403, 'Forbidden', ApiErrorCode.FORBIDDEN);
        return;
      }
      req.adminUser = payload;
      next();
      return;
    }
    const j = payload as JwtClaims & { purpose?: string };
    if (typeof j.userId === 'string' && j.userId && isMenuAdminEmail(j.email)) {
      req.user = j as JwtClaims;
      next();
      return;
    }
    fail(res, 403, 'Forbidden', ApiErrorCode.FORBIDDEN);
  } catch {
    fail(res, 401, 'Invalid or expired token', ApiErrorCode.UNAUTHORIZED);
  }
}
