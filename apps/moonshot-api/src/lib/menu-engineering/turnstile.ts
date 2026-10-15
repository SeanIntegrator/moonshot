import { ApiErrorCode } from '@moonshot/types';
import { config } from '../config.js';
import { ApiHttpError } from '../http-errors.js';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Verifies a Cloudflare Turnstile bot token when `TURNSTILE_SECRET_KEY` is configured.
 * In local development (when `TURNSTILE_SECRET_KEY` is unset), verification is skipped.
 */
export async function verifyTurnstileIfConfigured(
  token: string | undefined,
  remoteIp: string | undefined,
): Promise<void> {
  const secret = config.turnstileSecretKey;
  if (!secret) {
    return;
  }

  if (!token || !token.trim()) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'Bot check token is required to upload a menu.',
    );
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new ApiHttpError(
      502,
      ApiErrorCode.INTERNAL,
      'Could not verify bot check token with Cloudflare Turnstile.',
    );
  }

  const data = (await res.json()) as TurnstileVerifyResponse;
  if (!data.success) {
    throw new ApiHttpError(
      403,
      ApiErrorCode.FORBIDDEN,
      'Bot check failed — please refresh and try again.',
    );
  }
}
