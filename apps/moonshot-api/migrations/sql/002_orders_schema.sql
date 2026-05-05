-- Phase 2 — orders + order_items for core ordering loop
-- See docs/schema-draft.md

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  pos_order_id TEXT,
  customer_name TEXT NOT NULL,
  notes TEXT,
  total_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  order_type TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  quoted_pickup_time TIMESTAMPTZ,
  pickup_time TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  edit_token UUID DEFAULT gen_random_uuid(),
  parent_order_id UUID REFERENCES orders (id) ON DELETE SET NULL,
  stripe_checkout_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_total_minor_nonneg CHECK (total_minor >= 0),
  CONSTRAINT orders_order_type_check CHECK (
    order_type IN ('takeaway', 'eat_in')
  ),
  CONSTRAINT orders_source_check CHECK (
    source IN ('app', 'pos', 'whatsapp', 'web')
  ),
  CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'completed',
      'cancelled'
    )
  ),
  CONSTRAINT orders_payment_status_check CHECK (
    payment_status IN ('unpaid', 'paid', 'refunded', 'partially_refunded')
  )
);

CREATE UNIQUE INDEX orders_cafe_pos_order_unique ON orders (cafe_id, pos_order_id)
WHERE
  pos_order_id IS NOT NULL;

CREATE INDEX idx_orders_cafe_status_created ON orders (cafe_id, status, created_at DESC);

CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items (id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_minor INTEGER NOT NULL,
  modifiers JSONB NOT NULL DEFAULT '[]',
  allergens TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_nonneg CHECK (unit_price_minor >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

CREATE INDEX idx_order_items_menu_item_id ON order_items (menu_item_id);
