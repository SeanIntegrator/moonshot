-- Per-item flag: inject a synthetic "No milk" option for low-milk / tea drinks.
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS allow_no_milk BOOLEAN NOT NULL DEFAULT FALSE;

-- Americano, iced americano, and tea default to allowing no milk; macchiato/cortado stay off.
WITH normalised AS (
  SELECT
    id,
    lower(trim(both FROM regexp_replace(name, '[^a-zA-Z0-9]+', ' ', 'g'))) AS n
  FROM menu_items
)
UPDATE menu_items mi
SET allow_no_milk = TRUE
FROM normalised n
WHERE mi.id = n.id
  AND n.n IN ('americano', 'iced americano', 'breakfast tea', 'tea');
