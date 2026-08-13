import {
  isEligibleReviewPromptState,
  isTerminalReviewPromptState,
  type ReviewPromptPersistenceState,
} from '@moonshot/domain';
import type { Pool } from 'pg';

export type ReviewPromptAction = 'opened_url' | 'dismissed';

export type ConfirmReviewPromptResult = {
  /** State after the call (may be unchanged when already terminal). */
  reviewPromptState: string;
  /** True when this request transitioned from eligible → terminal. */
  updated: boolean;
};

function terminalForAction(action: ReviewPromptAction): ReviewPromptPersistenceState {
  return action === 'opened_url' ? 'shown' : 'dismissed';
}

/**
 * Record client confirmation of the single-CTA review prompt.
 * Only `eligible` transitions; terminal states are idempotent no-ops.
 */
export async function confirmReviewPrompt(params: {
  pool: Pool;
  cafeId: string;
  userId: string;
  action: ReviewPromptAction;
}): Promise<ConfirmReviewPromptResult | 'no_membership'> {
  const { pool, cafeId, userId, action } = params;
  const next = terminalForAction(action);

  const current = await pool.query<{ review_prompt_state: string }>(
    `SELECT review_prompt_state FROM cafe_users WHERE cafe_id = $1 AND user_id = $2`,
    [cafeId, userId],
  );
  const row = current.rows[0];
  if (!row) return 'no_membership';

  const state = row.review_prompt_state;
  if (isTerminalReviewPromptState(state)) {
    return { reviewPromptState: state, updated: false };
  }
  if (!isEligibleReviewPromptState(state)) {
    // not_shown or unknown — do not skip the 3-order rule
    return { reviewPromptState: state, updated: false };
  }

  const upd = await pool.query<{ review_prompt_state: string }>(
    `UPDATE cafe_users
     SET review_prompt_state = $1
     WHERE cafe_id = $2 AND user_id = $3 AND review_prompt_state = 'eligible'
     RETURNING review_prompt_state`,
    [next, cafeId, userId],
  );

  if (upd.rows[0]) {
    return { reviewPromptState: upd.rows[0].review_prompt_state, updated: true };
  }

  // Race: another request already moved off eligible
  const again = await pool.query<{ review_prompt_state: string }>(
    `SELECT review_prompt_state FROM cafe_users WHERE cafe_id = $1 AND user_id = $2`,
    [cafeId, userId],
  );
  return {
    reviewPromptState: again.rows[0]?.review_prompt_state ?? state,
    updated: false,
  };
}
