-- Add kid_ids array to materials so a resource can be assigned to specific children
-- NULL = all children (org-wide resource, existing behavior)
-- Non-null = one or more specific kids

ALTER TABLE materials ADD COLUMN IF NOT EXISTS kid_ids uuid[] DEFAULT NULL;

