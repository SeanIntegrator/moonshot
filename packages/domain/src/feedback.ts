/**
 * Post-order review prompt — 3× on-time rule + single-CTA (Google ToS–aligned).
 *
 * Phase B (docs/feedback-prompt-flow.md): emit sets `eligible`; client confirms
 * via POST /feedback/review-prompt → `shown` | `dismissed`.
 *
 * Parked: thumbs up/down + `feedback_responses` sentiment capture.
 */

import type { IsoDateTime } from '@moonshot/types';

export type ReviewSentiment = 'positive' | 'negative';

/**
 * Persisted on `cafe_users.review_prompt_state`.
 * @alias ReviewPromptState — canonical name in architecture docs
 */
export type ReviewPromptPersistenceState =
  | 'not_shown'
  | 'eligible'
  | 'shown'
  | 'dismissed'
  /** Legacy Phase A burn — treat as terminal (no re-show). */
  | 'shown_positive'
  | 'shown_negative';

/** Same as `ReviewPromptPersistenceState` (DB column `review_prompt_state`). */
export type ReviewPromptState = ReviewPromptPersistenceState;

/** States that must never re-open the review modal. */
const TERMINAL_REVIEW_PROMPT_STATES = new Set<string>([
  'shown',
  'dismissed',
  'shown_positive',
  'shown_negative',
]);

export function isTerminalReviewPromptState(state: string): boolean {
  return TERMINAL_REVIEW_PROMPT_STATES.has(state);
}

export function isEligibleReviewPromptState(state: string): boolean {
  return state === 'eligible';
}

/** Minimal shape for resolving the CTA URL from café features. */
export type ReviewNudgeUrlSource = {
  reviewUrl?: string | null;
  googlePlaceId?: string | null;
} | null;

/**
 * Prefer explicit `reviewUrl`; fall back to a Google write-review URL from
 * legacy `googlePlaceId` when present.
 */
export function resolveReviewUrl(config: ReviewNudgeUrlSource): string | null {
  if (!config) return null;
  const direct = typeof config.reviewUrl === 'string' ? config.reviewUrl.trim() : '';
  if (direct) return direct;
  const placeId =
    typeof config.googlePlaceId === 'string' ? config.googlePlaceId.trim() : '';
  if (!placeId) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/** Ephemeral UI state for the parked bottom drawer */
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

/** Parked — sentiment capture / feedback_responses table. */
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

/** Parked — thumbs payload. */
export interface SubmitFeedbackPayload {
  sentiment: ReviewSentiment;
  ownerMessage?: string | null;
  openedGoogleReview?: boolean;
}
