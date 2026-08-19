-- Explicit modifier slots + unclassified menu section kind (no name inference).

ALTER TABLE modifier_groups
  ADD COLUMN IF NOT EXISTS slot TEXT NOT NULL DEFAULT 'other';

ALTER TABLE modifier_groups
  DROP CONSTRAINT IF EXISTS modifier_groups_slot_check;

ALTER TABLE modifier_groups
  ADD CONSTRAINT modifier_groups_slot_check CHECK (
    slot IN (
      'milk',
      'syrup',
      'shots',
      'beans',
      'milk_temperature',
      'milk_texture',
      'ice_level',
      'toppings',
      'other'
    )
  );

-- One-shot backfill from exact Moonshot seed names only.
UPDATE modifier_groups SET slot = 'milk', updated_at = NOW() WHERE name = 'Milks';
UPDATE modifier_groups SET slot = 'syrup', updated_at = NOW() WHERE name = 'Syrups';
UPDATE modifier_groups SET slot = 'shots', updated_at = NOW() WHERE name = 'Shots';
UPDATE modifier_groups SET slot = 'beans', updated_at = NOW() WHERE name = 'Beans';
UPDATE modifier_groups SET slot = 'milk_temperature', updated_at = NOW() WHERE name = 'Milk Temperature';
UPDATE modifier_groups SET slot = 'milk_texture', updated_at = NOW() WHERE name = 'Milk Texture';
UPDATE modifier_groups SET slot = 'ice_level', updated_at = NOW() WHERE name = 'Ice Level';
UPDATE modifier_groups SET slot = 'toppings', updated_at = NOW() WHERE name = 'Toppings';

ALTER TABLE menu_sections
  DROP CONSTRAINT IF EXISTS menu_sections_kind_check;

ALTER TABLE menu_sections
  ADD CONSTRAINT menu_sections_kind_check CHECK (kind IN ('drink', 'food', 'unclassified'));

-- Square sections that were food only via label heuristics become unclassified until
-- nested under a parent literally named Food or Drink(s).
UPDATE menu_sections
SET kind = 'unclassified', updated_at = NOW()
WHERE pos_category_id IS NOT NULL
  AND kind = 'food'
  AND key <> 'food'
  AND lower(trim(label)) NOT IN ('food', 'drink', 'drinks');
