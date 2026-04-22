/**
 * Post-order review prompt — 3× on-time rule + Google-compliant paths.
 */

import type { IsoDateTime } from './order.js';

export type ReviewSentiment = 'positive' | 'negative';

/**
 * Persisted on `cafe_users.review_prompt_state`.
 * @alias ReviewPromptState — canonical name in architecture docs
 */
export type ReviewPromptPersistenceState =
  | 'not_shown'
  | 'shown_positive'
  | 'shown_negative'
  | 'dismissed';

/** Same as `ReviewPromptPersistenceState` (DB column `review_prompt_state`). */
export type ReviewPromptState = ReviewPromptPersistenceState;

/** Ephemeral UI state for the bottom drawer */
export type ReviewDrawerUiState = 'ask' | 'positive' | 'negative' | 'dismissed';

export interface ReviewPromptTrigger {
  /** Product rule: show after this many on-time app completions */
  threshold: 3;
  /** Grace after scheduled pickup — see docs/feedback-prompt-flow.md */
  onTimeGraceMinutes: 2;
}

export const REVIEW_PROMPT_TRIGGER: ReviewPromptTrigger = {
  threshold: 3,
  onTimeGraceMinutes: 2,
};

export interface FeedbackResponse {
  id: string;
  cafeId: string;
  userId: string;
  orderId: string | null;
  sentiment: ReviewSentiment;
  /** Negative path — private message to owner */
  ownerMessage: string | null;
  /** Client-reported engagement (optional analytics) */
  openedGoogleReview: boolean | null;
  createdAt: IsoDateTime;
}

export interface SubmitFeedbackPayload {
  sentiment: ReviewSentiment;
  ownerMessage?: string | null;
  openedGoogleReview?: boolean;
}
