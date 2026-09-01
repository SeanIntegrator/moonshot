import { describe, expect, it } from 'vitest';
import { squareConnectErrorMessage } from './square-connect-errors.js';

describe('squareConnectErrorMessage', () => {
  it('maps known OAuth failure reasons', () => {
    expect(squareConnectErrorMessage('access_denied')).toContain('cancelled');
    expect(squareConnectErrorMessage('invalid_state')).toContain('expired');
    expect(squareConnectErrorMessage('exchange_failed')).toContain('Could not complete');
    expect(squareConnectErrorMessage('merchant_in_use')).toContain('already connected');
    expect(squareConnectErrorMessage('merchant_in_use', { otherCafe: 'quirky' })).toContain(
      'connected to quirky',
    );
  });

  it('falls back for unknown reasons', () => {
    expect(squareConnectErrorMessage('something_else')).toContain('failed');
  });
});
