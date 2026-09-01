import type { NextFunction, Request, Response } from 'express';

const SENSITIVE_QUERY_KEYS = new Set(['code', 'state', 'token']);

/** Strip OAuth codes / CSRF state from request logs. */
export function redactSensitiveQuery(originalUrl: string): string {
  const q = originalUrl.indexOf('?');
  if (q === -1) return originalUrl;
  const path = originalUrl.slice(0, q);
  const params = new URLSearchParams(originalUrl.slice(q + 1));
  let changed = false;
  for (const key of [...params.keys()]) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
      params.set(key, 'redacted');
      changed = true;
    }
  }
  return changed ? `${path}?${params.toString()}` : originalUrl;
}

/**
 * Lightweight request timing log: method, path, status, duration.
 * Mount after helmet/cors and before heavy routers.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - started;
    const path = redactSensitiveQuery(req.originalUrl || req.url);
    console.log(
      `[http] ${req.method} ${path} ${res.statusCode} ${durationMs}ms`,
    );
  });
  next();
}
