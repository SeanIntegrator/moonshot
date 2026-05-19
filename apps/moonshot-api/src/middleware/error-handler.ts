import { ApiErrorCode } from '@moonshot/types';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ApiHttpError } from '../lib/http-errors.js';

/**
 * Express 5 forwards rejected async handlers to error middleware automatically,
 * so route handlers can just `throw new ApiHttpError(...)` and stop. This
 * centralised handler converts:
 *   - {@link ApiHttpError} → its own status + code + message
 *   - anything else → generic 500 `{ ok: false, error: 'Internal error', code: 'INTERNAL' }`
 *
 * Structured details are logged server-side; the client only sees the generic
 * message to avoid leaking internals.
 */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  /* Express requires the four-arg signature; once a response has started we
   * can't safely write a new body — fall through to Express's default. */
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ApiHttpError) {
    res.status(err.status).json({
      ok: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error('[api.error] unhandled route failure', {
    method: req.method,
    path: req.originalUrl,
    cafeId: req.cafe?.cafeId ?? null,
    message,
    stack,
  });

  res.status(500).json({
    ok: false,
    error: 'Internal error',
    code: ApiErrorCode.INTERNAL,
  });
};
