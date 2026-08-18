import { describe, expect, it } from 'vitest';
import { isReviewUrlValid, normaliseReviewUrl, reviewUrlError } from './review-url.js';

describe('reviewUrlError', () => {
  it('rejects empty', () => {
    expect(reviewUrlError('')).not.toBeNull();
    expect(isReviewUrlValid('')).toBe(false);
  });

  it('rejects non-http schemes', () => {
    expect(reviewUrlError('javascript:alert(1)')).not.toBeNull();
  });

  it('accepts https URLs', () => {
    expect(reviewUrlError('https://g.page/r/abc')).toBeNull();
    expect(isReviewUrlValid('https://g.page/r/abc')).toBe(true);
  });

  it('accepts a host without a scheme and normalises it', () => {
    expect(reviewUrlError('google.com/search?q=clayandbean')).toBeNull();
    expect(normaliseReviewUrl('google.com/search?q=clayandbean')).toBe(
      'https://google.com/search?q=clayandbean',
    );
  });
});
