/** Matches pinned `server.port` in each app's vite.config.ts */
const LOCAL_DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5176',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

/**
 * Parses `CORS_ORIGINS` (comma-separated, full origins including scheme).
 * Empty / unset → empty array.
 */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  const s = raw ?? '';
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Whether browser `Origin` is allowed given env allowlist. */
export function resolveCorsOriginDecision(
  requestOrigin: string | undefined,
  allowedFromEnv: string[],
  options: { isProduction: boolean },
): boolean {
  if (!requestOrigin) {
    return true;
  }

  if (allowedFromEnv.length > 0) {
    if (allowedFromEnv.includes(requestOrigin)) {
      return true;
    }
    if (!options.isProduction && LOCAL_DEV_ORIGINS.has(requestOrigin)) {
      return true;
    }
    return false;
  }

  if (!options.isProduction) {
    return true;
  }

  /** Production requires `CORS_ORIGINS` — empty means deny browsers with an Origin header. */
  return false;
}

export function createCorsOriginValidator(
  allowedFromEnv: string[],
  isProduction: boolean,
): (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => void {
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const allowed = resolveCorsOriginDecision(origin, allowedFromEnv, {
      isProduction,
    });
    if (allowed) {
      callback(null, origin);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  };
}
