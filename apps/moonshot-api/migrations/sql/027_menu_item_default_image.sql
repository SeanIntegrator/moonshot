-- Track where menu item photos come from and whether POS sync may apply template defaults.

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_source TEXT
    CHECK (image_source IS NULL OR image_source IN ('pos', 'upload', 'template')),
  ADD COLUMN IF NOT EXISTS use_default_image BOOLEAN NOT NULL DEFAULT TRUE;

-- Legacy rows already pointing at shared template objects.
UPDATE menu_items
SET image_source = 'template'
WHERE image_source IS NULL
  AND image_url IS NOT NULL
  AND image_url LIKE '%/template/drinks/%';
