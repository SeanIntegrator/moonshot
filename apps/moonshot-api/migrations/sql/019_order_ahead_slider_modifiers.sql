-- Order-ahead slider customisation: price Triple/Quad shots; Warm leftmost on
-- milk temperature; Wet→Standard→Dry texture order; Beans before Shots on drinks.

-- ── Shots: +80p for Triple / Quad ──────────────────────────────────────────
UPDATE modifier_groups
SET options = (
  SELECT jsonb_agg(
    CASE
      WHEN lower(opt->>'name') IN ('triple', 'quad')
        THEN jsonb_set(opt, '{priceMinor}', '80'::jsonb, true)
      ELSE opt
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(options) WITH ORDINALITY AS t(opt, ord)
)
WHERE name = 'Shots';

-- ── Milk Temperature: Warm, Hot, Extra Hot, Extra Extra Hot ────────────────
UPDATE modifier_groups
SET options = (
  SELECT jsonb_agg(opt ORDER BY
    CASE lower(opt->>'name')
      WHEN 'warm' THEN 0
      WHEN 'hot' THEN 1
      WHEN 'extra hot' THEN 2
      WHEN 'extra extra hot' THEN 3
      ELSE 100 + ord::int
    END
  )
  FROM jsonb_array_elements(options) WITH ORDINALITY AS t(opt, ord)
)
WHERE name = 'Milk Temperature';

-- ── Milk Texture: Wet, Standard, Dry, Extra Foam ───────────────────────────
UPDATE modifier_groups
SET options = (
  SELECT jsonb_agg(opt ORDER BY
    CASE lower(opt->>'name')
      WHEN 'wet' THEN 0
      WHEN 'standard' THEN 1
      WHEN 'dry' THEN 2
      WHEN 'extra foam' THEN 3
      ELSE 100 + ord::int
    END
  )
  FROM jsonb_array_elements(options) WITH ORDINALITY AS t(opt, ord)
)
WHERE name = 'Milk Texture';

-- ── Library sort_order: Beans before Shots ─────────────────────────────────
UPDATE modifier_groups SET sort_order = 2 WHERE name = 'Beans';
UPDATE modifier_groups SET sort_order = 3 WHERE name = 'Shots';

-- ── Per-item attachment: swap Beans / Shots when Shots currently precedes Beans
WITH ranked AS (
  SELECT
    mimg.menu_item_id,
    mimg.modifier_group_id,
    mg.name,
    mimg.sort_order,
    MIN(mimg.sort_order) FILTER (WHERE mg.name = 'Beans')
      OVER (PARTITION BY mimg.menu_item_id) AS beans_sort,
    MIN(mimg.sort_order) FILTER (WHERE mg.name = 'Shots')
      OVER (PARTITION BY mimg.menu_item_id) AS shots_sort
  FROM menu_item_modifier_groups mimg
  JOIN modifier_groups mg ON mg.id = mimg.modifier_group_id
  WHERE mg.name IN ('Beans', 'Shots')
)
UPDATE menu_item_modifier_groups mimg
SET sort_order = CASE r.name
  WHEN 'Beans' THEN r.shots_sort
  WHEN 'Shots' THEN r.beans_sort
  ELSE mimg.sort_order
END
FROM ranked r
WHERE mimg.menu_item_id = r.menu_item_id
  AND mimg.modifier_group_id = r.modifier_group_id
  AND r.beans_sort IS NOT NULL
  AND r.shots_sort IS NOT NULL
  AND r.shots_sort < r.beans_sort;
