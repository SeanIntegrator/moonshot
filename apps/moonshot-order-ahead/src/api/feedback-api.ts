import { apiFetch } from '../lib/api.js';

export type ReviewPromptAction = 'opened_url' | 'dismissed';

export type ReviewPromptConfirmResponse = {
  reviewPromptState: string;
  updated: boolean;
};

export function confirmReviewPrompt(
  action: ReviewPromptAction,
): Promise<ReviewPromptConfirmResponse> {
  return apiFetch<ReviewPromptConfirmResponse>('/feedback/review-prompt', {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}
