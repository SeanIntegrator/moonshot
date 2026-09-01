import { describe, expect, it } from 'vitest';
import {
  hasSquareConnectQuery,
  squareConnectErrorMessage,
  squareConnectNoticeFromSearch,
  stripSquareConnectSearchParams,
} from './square-connect-errors.js';

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

describe('squareConnectNoticeFromSearch', () => {
  it('builds an error toast for merchant already in use', () => {
    const notice = squareConnectNoticeFromSearch(
      '?squareConnect=error&reason=merchant_in_use&otherCafe=quirky',
    );
    expect(notice?.severity).toBe('error');
    expect(notice?.message).toContain('connected to quirky');
  });

  it('builds a success toast when connected', () => {
    expect(squareConnectNoticeFromSearch('squareConnect=connected')).toEqual({
      severity: 'success',
      message: 'Square connected.',
    });
  });

  it('returns null when Square did not redirect', () => {
    expect(squareConnectNoticeFromSearch('')).toBeNull();
    expect(squareConnectNoticeFromSearch('?squareConnect=')).toBeNull();
  });
});

describe('hasSquareConnectQuery', () => {
  it('is true for an empty squareConnect value', () => {
    expect(hasSquareConnectQuery('?squareConnect=')).toBe(true);
    expect(hasSquareConnectQuery('?keep=1')).toBe(false);
  });
});

describe('stripSquareConnectSearchParams', () => {
  it('drops Square OAuth keys and keeps unrelated params', () => {
    expect(
      stripSquareConnectSearchParams(
        '?squareConnect=error&reason=merchant_in_use&otherCafe=quirky&keep=1',
      ),
    ).toBe('keep=1');
  });

  it('strips an empty squareConnect value', () => {
    expect(stripSquareConnectSearchParams('?squareConnect=&keep=1')).toBe('keep=1');
  });
});
