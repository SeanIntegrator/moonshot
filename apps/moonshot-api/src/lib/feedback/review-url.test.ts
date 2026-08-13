import { describe, expect, it } from 'vitest';
import {
  isEligibleReviewPromptState,
  isTerminalReviewPromptState,
  resolveReviewUrl,
} from '@moonshot/domain';

describe('resolveReviewUrl', () => {
  it('prefers reviewUrl over googlePlaceId', () => {
    expect(
      resolveReviewUrl({
        reviewUrl: 'https://example.com/review',
        googlePlaceId: 'ChIJxxx',
      }),
    ).toBe('https://example.com/review');
  });

  it('builds a Google write-review URL from googlePlaceId', () => {
    expect(resolveReviewUrl({ reviewUrl: null, googlePlaceId: 'ChIJxxx' })).toBe(
      'https://search.google.com/local/writereview?placeid=ChIJxxx',
    );
  });

  it('returns null when neither is set', () => {
    expect(resolveReviewUrl({ reviewUrl: null, googlePlaceId: null })).toBeNull();
    expect(resolveReviewUrl(null)).toBeNull();
  });
});

describe('review prompt state helpers', () => {
  it('treats shown / dismissed / legacy burns as terminal', () => {
    expect(isTerminalReviewPromptState('shown')).toBe(true);
    expect(isTerminalReviewPromptState('dismissed')).toBe(true);
    expect(isTerminalReviewPromptState('shown_positive')).toBe(true);
    expect(isTerminalReviewPromptState('shown_negative')).toBe(true);
    expect(isTerminalReviewPromptState('eligible')).toBe(false);
    expect(isTerminalReviewPromptState('not_shown')).toBe(false);
  });

  it('recognises eligible', () => {
    expect(isEligibleReviewPromptState('eligible')).toBe(true);
    expect(isEligibleReviewPromptState('not_shown')).toBe(false);
  });
});
