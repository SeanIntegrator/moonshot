-- Phase A burned eligibility to shown_positive at emit time before any UI existed.
-- Re-open those rows so the single-CTA modal can still show once.

UPDATE cafe_users
SET review_prompt_state = 'eligible'
WHERE review_prompt_state = 'shown_positive';
