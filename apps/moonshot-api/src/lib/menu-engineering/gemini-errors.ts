import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../http-errors.js';

/** Keep the banner readable and avoid echoing a whole provider payload. */
const MAX_PROVIDER_DETAIL_CHARS = 360;

const SECRET_PATTERNS: readonly RegExp[] = [
  /AIza[0-9A-Za-z\-_]{8,}/g,
  /\bkey=[^&\s]+/gi,
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
];

/**
 * Strip credentials Google sometimes echoes (query `key=`, `AIza…` keys, bearer
 * tokens) before a provider message is logged or returned to the browser.
 */
export function sanitizeProviderMessage(raw: string): string {
  let text = raw;
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, '[redacted]');
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_PROVIDER_DETAIL_CHARS);
}

function readProviderStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('status' in err)) {
    return undefined;
  }
  const status = (err as { status: unknown }).status;
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return status;
  }
  return undefined;
}

function statusToHttp(providerStatus: number | undefined): {
  status: number;
  code: ApiErrorCode;
} {
  if (providerStatus === 401 || providerStatus === 403) {
    return { status: 503, code: ApiErrorCode.CONFIG };
  }
  if (providerStatus === 429) {
    return { status: 429, code: ApiErrorCode.RATE_LIMITED };
  }
  if (providerStatus === 404 || (providerStatus !== undefined && providerStatus >= 400 && providerStatus < 500)) {
    return { status: 502, code: ApiErrorCode.VALIDATION };
  }
  return { status: 502, code: ApiErrorCode.INTERNAL };
}

/**
 * A provider failure the model cascade can choose to retry.
 * Auth failures (401/403) are not retryable: every Gemini model shares one key.
 * Overload (503), rate limits, a missing model (404), and a menu the model
 * could not read are retryable on the next model.
 */
export class MenuEngineeringAttemptError extends ApiHttpError {
  readonly retryable: boolean;

  constructor(status: number, code: ApiErrorCode, message: string, retryable: boolean) {
    super(status, code, message);
    this.name = 'MenuEngineeringAttemptError';
    this.retryable = retryable;
  }
}

export function isRetryableMenuEngineeringError(err: unknown): boolean {
  if (err instanceof MenuEngineeringAttemptError) return err.retryable;
  if (err instanceof ApiHttpError) {
    return err.code !== ApiErrorCode.CONFIG && err.status !== 401 && err.status !== 403;
  }
  return true;
}

/**
 * Turn a thrown provider or parse error into an {@link ApiHttpError} the menu
 * audit UI can show. Known {@link ApiHttpError}s pass through unchanged.
 * The global error handler still hides unexpected failures elsewhere as
 * "Internal error".
 */
export function explainMenuEngineeringFailure(
  err: unknown,
  context: string,
): MenuEngineeringAttemptError | ApiHttpError {
  if (err instanceof ApiHttpError) {
    return err;
  }
  const providerStatus = readProviderStatus(err);
  const raw = err instanceof Error ? err.message : String(err);
  const detail = sanitizeProviderMessage(raw) || 'no error details';
  const mapped = statusToHttp(providerStatus);
  const providerLabel =
    providerStatus !== undefined ? ` (provider HTTP ${providerStatus})` : '';
  const retryable = providerStatus !== 401 && providerStatus !== 403;
  return new MenuEngineeringAttemptError(
    mapped.status,
    mapped.code,
    `${context} failed${providerLabel}: ${detail}`,
    retryable,
  );
}
