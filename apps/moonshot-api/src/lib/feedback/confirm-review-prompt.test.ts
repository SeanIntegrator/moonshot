import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmReviewPrompt } from './confirm-review-prompt.js';

describe('confirmReviewPrompt', () => {
  const query = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions eligible → shown on opened_url', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ review_prompt_state: 'eligible' }] })
      .mockResolvedValueOnce({ rows: [{ review_prompt_state: 'shown' }] });

    const result = await confirmReviewPrompt({
      pool: { query } as never,
      cafeId: 'cafe',
      userId: 'user',
      action: 'opened_url',
    });

    expect(result).toEqual({ reviewPromptState: 'shown', updated: true });
  });

  it('transitions eligible → dismissed on dismissed', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ review_prompt_state: 'eligible' }] })
      .mockResolvedValueOnce({ rows: [{ review_prompt_state: 'dismissed' }] });

    const result = await confirmReviewPrompt({
      pool: { query } as never,
      cafeId: 'cafe',
      userId: 'user',
      action: 'dismissed',
    });

    expect(result).toEqual({ reviewPromptState: 'dismissed', updated: true });
  });

  it('is a no-op when already terminal', async () => {
    query.mockResolvedValueOnce({ rows: [{ review_prompt_state: 'shown' }] });

    const result = await confirmReviewPrompt({
      pool: { query } as never,
      cafeId: 'cafe',
      userId: 'user',
      action: 'opened_url',
    });

    expect(result).toEqual({ reviewPromptState: 'shown', updated: false });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not advance not_shown (skips the 3-order rule)', async () => {
    query.mockResolvedValueOnce({ rows: [{ review_prompt_state: 'not_shown' }] });

    const result = await confirmReviewPrompt({
      pool: { query } as never,
      cafeId: 'cafe',
      userId: 'user',
      action: 'dismissed',
    });

    expect(result).toEqual({ reviewPromptState: 'not_shown', updated: false });
  });

  it('returns no_membership when cafe_users row is missing', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const result = await confirmReviewPrompt({
      pool: { query } as never,
      cafeId: 'cafe',
      userId: 'user',
      action: 'opened_url',
    });

    expect(result).toBe('no_membership');
  });
});
