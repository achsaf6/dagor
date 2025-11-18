-- Add a dedicated sort index so battlemaps can be manually reordered
ALTER TABLE battlemaps
  ADD COLUMN IF NOT EXISTS sort_index INTEGER;

-- Initialize sort_index values based on the existing creation order
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS row_index
  FROM battlemaps
)
UPDATE battlemaps AS b
SET sort_index = ordered.row_index
FROM ordered
WHERE b.id = ordered.id
  AND (b.sort_index IS NULL OR b.sort_index <> ordered.row_index);

-- Ensure new rows always have a defined sort order
ALTER TABLE battlemaps
  ALTER COLUMN sort_index SET DEFAULT 0;

UPDATE battlemaps
SET sort_index = 0
WHERE sort_index IS NULL;

ALTER TABLE battlemaps
  ALTER COLUMN sort_index SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_battlemaps_sort_index ON battlemaps(sort_index ASC, created_at ASC);

