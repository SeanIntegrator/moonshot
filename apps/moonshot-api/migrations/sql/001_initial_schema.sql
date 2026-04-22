-- Phase 1 foundation — cafes, users, cafe_users, menu_items
-- See docs/schema-draft.md in monorepo root.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  pos_provider TEXT NOT NULL,
  pos_config JSONB NOT NULL DEFAULT '{}',
  payment_provider TEXT NOT NULL DEFAULT 'stripe',
  payment_config JSONB NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}',
  theme_id TEXT NOT NULL DEFAULT 'heritage',
  theme_overrides JSONB NOT NULL DEFAULT '{}',
  kds_config JSONB NOT NULL DEFAULT '{}',
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  owner_feedback_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cafe_users (
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  loyalty_stamps INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  on_time_completed_orders INTEGER NOT NULL DEFAULT 0,
  review_prompt_state TEXT NOT NULL DEFAULT 'not_shown',
  first_visit TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cafe_id, user_id)
);

CREATE INDEX idx_cafe_users_user_id ON cafe_users (user_id);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  pos_item_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  category TEXT NOT NULL,
  subcategory TEXT,
  image_url TEXT,
  emoji TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  modifier_groups JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX menu_items_cafe_pos_item_unique ON menu_items (cafe_id, pos_item_id)
WHERE
  pos_item_id IS NOT NULL;

CREATE INDEX idx_menu_items_cafe_id ON menu_items (cafe_id);

CREATE INDEX idx_menu_items_cafe_category ON menu_items (cafe_id, category);

-- Dev seed: Clay & Bean–style slug (adjust in production via admin later)
INSERT INTO
  cafes (
    name,
    slug,
    pos_provider,
    features,
    theme_id,
    theme_overrides,
    kds_config
  )
VALUES
  (
    'Clay & Bean',
    'clay-and-bean',
    'manual',
    '{
      "loyalty": null,
      "events": null,
      "promotions": null,
      "order_ahead": {
        "enabled": true,
        "paymentProvider": "stripe",
        "pickupTimeEnabled": true,
        "defaultPickupMinutes": 10,
        "maxPickupMinutes": 60,
        "notesEnabled": true
      },
      "review_nudge": null,
      "saved_orders": null,
      "whatsapp_ordering": null
    }'::jsonb,
    'heritage',
    '{}'::jsonb,
    '{
      "milkColors": {},
      "beanBadges": {
        "house": { "label": "Ho", "bg": "#2d2d2d", "text": "#f5f5f5" },
        "decaf": { "label": "Dc", "bg": "#6b4f2a", "text": "#fff" },
        "guest": { "label": "Gu", "bg": "#1a4d3a", "text": "#fff" },
        "custom": []
      },
      "modifierClassification": { "coffeeModifiers": [], "additions": [] },
      "timerThresholds": { "greenMax": 3, "amberMax": 5 },
      "layout": { "columns": 3, "groupBy": "order_type" },
      "audio": { "newOrderSound": null, "volume": 80 },
      "display": {
        "showCustomerNameInHeader": true,
        "showPickupTime": true,
        "showOrderSource": true
      },
      "eta": { "basePrepMinutes": 8, "perItemMinutes": 2 }
    }'::jsonb
  );

UPDATE cafes
SET
  kds_config = jsonb_set(kds_config, '{cafeId}', to_jsonb(id::text), TRUE)
WHERE
  slug = 'clay-and-bean';

INSERT INTO
  menu_items (cafe_id, name, description, price_minor, category, tags, modifier_groups, sort_order)
SELECT
  id,
  'Flat White',
  'Double shot, steamed milk',
  350,
  'hot_drinks',
  ARRAY[]::TEXT[],
  '[]'::jsonb,
  0
FROM
  cafes
WHERE
  slug = 'clay-and-bean';
