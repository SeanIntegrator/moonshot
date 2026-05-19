-- Phase 9 — clarify loyalty progress semantics
--
-- `cafe_users.loyalty_stamps` changed meaning in Phase 7 from a lifetime stamp
-- counter to a punch-card progress value (resets at `stampsPerReward`). Rename
-- the column so the name reflects the new meaning. Data is preserved as-is.
--
-- All reads/writes are updated in code in the same change so the migration is a
-- pure rename. No data backfill is needed.

ALTER TABLE cafe_users
RENAME COLUMN loyalty_stamps TO loyalty_card_progress;

COMMENT ON COLUMN cafe_users.loyalty_card_progress IS
'Stamps earned toward the current free reward (0..features.loyalty.stampsPerReward-1). Authoritative ledger lives in loyalty_transactions.';
