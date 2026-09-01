import { describe, expect, it } from 'vitest';
import { redactSensitiveQuery } from './request-logger.js';

describe('redactSensitiveQuery', () => {
  it('redacts Square OAuth code and state', () => {
    expect(
      redactSensitiveQuery(
        '/api/v1/admin/connect/square/return?code=sq0cgp-secret&response_type=code&state=jwt.here',
      ),
    ).toBe(
      '/api/v1/admin/connect/square/return?code=redacted&response_type=code&state=redacted',
    );
  });

  it('leaves ordinary query strings unchanged', () => {
    expect(redactSensitiveQuery('/api/v1/admin/onboarding/slug-available?slug=loadstar')).toBe(
      '/api/v1/admin/onboarding/slug-available?slug=loadstar',
    );
  });
});
