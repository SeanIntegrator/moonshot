-- Phase 12 — café modifier library, item attachment join, per-item sizes.

ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS sizes JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selection_type TEXT NOT NULL DEFAULT 'single',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  max_select INTEGER,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT modifier_groups_selection_type_check CHECK (selection_type IN ('single', 'multi'))
);

CREATE INDEX idx_modifier_groups_cafe_id ON modifier_groups (cafe_id);

CREATE TABLE menu_item_modifier_groups (
  menu_item_id UUID NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
  modifier_group_id UUID NOT NULL REFERENCES modifier_groups (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (menu_item_id, modifier_group_id)
);

CREATE INDEX idx_menu_item_modifier_groups_item ON menu_item_modifier_groups (menu_item_id);
