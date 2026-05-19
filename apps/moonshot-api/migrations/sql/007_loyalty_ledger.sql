-- Phase 7 — loyalty ledger + stable display id on cafe_users

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders (id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,
  stamps_delta INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_transactions_type_check CHECK (
    transaction_type IN ('stamp_earned', 'reward_earned', 'reward_redeemed', 'adjustment')
  )
);

CREATE UNIQUE INDEX loyalty_transactions_stamp_order_unique ON loyalty_transactions (cafe_id, user_id, order_id)
WHERE
  transaction_type = 'stamp_earned'
  AND order_id IS NOT NULL;

CREATE INDEX loyalty_transactions_user_created ON loyalty_transactions (cafe_id, user_id, created_at DESC);

CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL DEFAULT 'free_coffee',
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX loyalty_rewards_user_unredeemed ON loyalty_rewards (cafe_id, user_id)
WHERE
  redeemed_at IS NULL;

CREATE INDEX loyalty_rewards_user_created ON loyalty_rewards (cafe_id, user_id, created_at DESC);

ALTER TABLE cafe_users
ADD COLUMN loyalty_display_id TEXT;

UPDATE cafe_users cu
SET
  loyalty_display_id = substr(md5((cu.cafe_id::text || cu.user_id::text)), 1, 8);

ALTER TABLE cafe_users
ALTER COLUMN loyalty_display_id
SET NOT NULL;

CREATE UNIQUE INDEX cafe_users_cafe_loyalty_display_unique ON cafe_users (cafe_id, loyalty_display_id);

CREATE OR REPLACE FUNCTION cafe_users_assign_loyalty_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.loyalty_display_id IS NULL THEN
    NEW.loyalty_display_id := substr(md5(NEW.cafe_id::text || NEW.user_id::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cafe_users_loyalty_display_id
BEFORE INSERT ON cafe_users
FOR EACH ROW
EXECUTE PROCEDURE cafe_users_assign_loyalty_display_id();
