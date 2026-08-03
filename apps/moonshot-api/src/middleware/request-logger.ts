import type { NextFunction, Request, Response } from 'express';

/**
 * Lightweight request timing log: method, path, status, duration.
 * Mount after helmet/cors and before heavy routers.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - started;
    const path = req.originalUrl || req.url;
    console.log(
      `[http] ${req.method} ${path} ${res.statusCode} ${durationMs}ms`,
    );
  });
  next();
}
