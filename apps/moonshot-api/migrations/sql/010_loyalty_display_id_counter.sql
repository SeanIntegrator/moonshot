-- Phase 10 — per-café numeric loyalty display id for new memberships
--
-- The original trigger from 007_loyalty_ledger.sql derives
--   loyalty_display_id = substr(md5(cafe_id || user_id), 1, 8)
-- which is only 32 bits of entropy. The trigger has no retry-on-conflict and
-- the unique index on (cafe_id, loyalty_display_id) starts rejecting inserts
-- well before the birthday-paradox 50% mark (~77k members per café).
--
-- Replace the trigger with a per-café atomic counter and a 6-digit zero-padded
-- ID that's easy for staff to read at the till. Existing rows keep their
-- current display id so any printed QR/receipts stay valid; the counter for
-- each café is seeded above the count of existing members so new IDs cannot
-- collide with legacy ones (the unique index catches the rare edge case).

ALTER TABLE cafes
ADD COLUMN loyalty_display_counter INTEGER NOT NULL DEFAULT 0;

UPDATE cafes c
SET loyalty_display_counter = COALESCE(sub.cnt, 0)
FROM (
  SELECT cafe_id, COUNT(*)::INTEGER AS cnt
  FROM cafe_users
  GROUP BY cafe_id
) sub
WHERE sub.cafe_id = c.id;

CREATE OR REPLACE FUNCTION cafe_users_assign_loyalty_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_counter INTEGER;
  candidate TEXT;
  attempt INTEGER := 0;
BEGIN
  IF NEW.loyalty_display_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Retry loop to ride out the unlikely case where the deterministic legacy
  -- IDs collide with a newly generated numeric ID at this café.
  LOOP
    UPDATE cafes
    SET loyalty_display_counter = loyalty_display_counter + 1
    WHERE id = NEW.cafe_id
    RETURNING loyalty_display_counter INTO next_counter;

    IF next_counter IS NULL THEN
      RAISE EXCEPTION 'cafe % not found when assigning loyalty_display_id', NEW.cafe_id;
    END IF;

    candidate := lpad(next_counter::text, 6, '0');

    -- A duplicate against an existing row is extremely unlikely (legacy IDs
    -- are hex with letters, new IDs are pure digits) but guard regardless.
    IF NOT EXISTS (
      SELECT 1 FROM cafe_users
      WHERE cafe_id = NEW.cafe_id AND loyalty_display_id = candidate
    ) THEN
      NEW.loyalty_display_id := candidate;
      RETURN NEW;
    END IF;

    attempt := attempt + 1;
    IF attempt > 100 THEN
      RAISE EXCEPTION 'could not assign unique loyalty_display_id for cafe % after % attempts', NEW.cafe_id, attempt;
    END IF;
  END LOOP;
END;
$$;
