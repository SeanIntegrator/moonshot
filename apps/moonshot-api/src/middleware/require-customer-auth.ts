import type { NextFunction, Request, Response } from 'express';
import { ApiErrorCode } from '@moonshot/types';
import { optionalCustomerAuth } from './optional-customer-auth.js';

/**
 * Requires a valid customer JWT. Reuses optionalCustomerAuth verification,
 * then rejects when no customer user id was attached.
 */
export function requireCustomerAuth(req: Request, res: Response, next: NextFunction): void {
  optionalCustomerAuth(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }
    if (res.headersSent) return;
    if (!req.customerUserId) {
      res.status(401).json({
        ok: false,
        error: 'Sign in required to place an order',
        code: ApiErrorCode.UNAUTHORIZED,
      });
      return;
    }
    next();
  });
}
