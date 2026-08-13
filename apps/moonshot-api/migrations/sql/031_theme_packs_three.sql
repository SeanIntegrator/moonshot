-- Map legacy five-pack theme ids onto Minimal / Organic / Lively.
-- Unknown values fall back to minimal.

UPDATE cafes
SET theme_id = CASE theme_id
  WHEN 'heritage' THEN 'minimal'
  WHEN 'minimal' THEN 'minimal'
  WHEN 'botanical' THEN 'organic'
  WHEN 'classic' THEN 'organic'
  WHEN 'organic' THEN 'organic'
  WHEN 'bold' THEN 'lively'
  WHEN 'lively' THEN 'lively'
  ELSE 'minimal'
END
WHERE theme_id IS DISTINCT FROM CASE theme_id
  WHEN 'heritage' THEN 'minimal'
  WHEN 'minimal' THEN 'minimal'
  WHEN 'botanical' THEN 'organic'
  WHEN 'classic' THEN 'organic'
  WHEN 'organic' THEN 'organic'
  WHEN 'bold' THEN 'lively'
  WHEN 'lively' THEN 'lively'
  ELSE 'minimal'
END;

ALTER TABLE cafes ALTER COLUMN theme_id SET DEFAULT 'organic';
