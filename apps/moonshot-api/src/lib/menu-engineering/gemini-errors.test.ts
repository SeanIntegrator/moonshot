import { ApiErrorCode } from '@moonshot/types';
import { describe, expect, it } from 'vitest';
import { ApiHttpError } from '../http-errors.js';
import { explainMenuEngineeringFailure, sanitizeProviderMessage } from './gemini-errors.js';

describe('menu engineering provider errors', () => {
  it('redacts API keys and bearer tokens from provider text', () => {
    const raw =
      'request failed key=AIzaSySUPERSECRETKEYVALUE Bearer abc.def-ghi for model';
    const clean = sanitizeProviderMessage(raw);
    expect(clean).not.toContain('AIza');
    expect(clean).not.toContain('abc.def');
    expect(clean).toContain('[redacted]');
    expect(clean).toContain('request failed');
  });

  it('turns a provider 400 into a banner-ready error without the secret', () => {
    const err = new Error(
      'INVALID_ARGUMENT schema too complex key=AIzaSySUPERSECRETKEYVALUE',
    );
    (err as Error & { status: number }).status = 400;

    const httpErr = explainMenuEngineeringFailure(err, 'Gemini extract (model gemini-2.5-flash)');

    expect(httpErr).toBeInstanceOf(ApiHttpError);
    expect(httpErr.status).toBe(502);
    expect(httpErr.code).toBe(ApiErrorCode.VALIDATION);
    expect(httpErr.message).toContain('provider HTTP 400');
    expect(httpErr.message).toContain('gemini-2.5-flash');
    expect(httpErr.message).toContain('schema too complex');
    expect(httpErr.message).not.toContain('AIza');
  });

  it('maps an auth rejection to a config error', () => {
    const err = new Error('API key not valid');
    (err as Error & { status: number }).status = 401;

    const httpErr = explainMenuEngineeringFailure(err, 'Gemini extract (model gemini-2.5-flash)');
    expect(httpErr.status).toBe(503);
    expect(httpErr.code).toBe(ApiErrorCode.CONFIG);
    expect(httpErr.message).toContain('API key not valid');
  });

  it('passes ApiHttpError through unchanged', () => {
    const original = new ApiHttpError(422, ApiErrorCode.VALIDATION, 'No readable menu items');
    expect(explainMenuEngineeringFailure(original, 'POST /menu-engineering/extract')).toBe(
      original,
    );
  });
});
