import { ApiErrorCode } from '@moonshot/types';
import type { IRouter } from 'express';
import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCafeContext } from '../middleware/cafe-context.js';
import { confirmReviewPrompt } from '../lib/feedback/confirm-review-prompt.js';
import { ApiHttpError } from '../lib/http-errors.js';
import { parseBody } from '../lib/validation/auth-bodies.js';
import { reviewPromptBodySchema } from '../lib/validation/feedback-bodies.js';

export const feedbackRouter: IRouter = Router();

feedbackRouter.use(requireCafeContext);

/**
 * Client confirms the single-CTA review prompt (opened URL or dismissed).
 * Terminal-state only — no sentiment / feedback_responses.
 */
feedbackRouter.post('/review-prompt', requireAuth, async (req, res) => {
  const cafeId = req.cafe!.cafeId;
  const userId = req.user!.userId;

  const parsed = parseBody(reviewPromptBodySchema, req.body);
  if (!parsed.ok) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, parsed.error);
  }

  const result = await confirmReviewPrompt({
    pool,
    cafeId,
    userId,
    action: parsed.data.action,
  });

  if (result === 'no_membership') {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'No café membership for this user');
  }

  return res.json({
    ok: true,
    data: {
      reviewPromptState: result.reviewPromptState,
      updated: result.updated,
    },
  });
});
