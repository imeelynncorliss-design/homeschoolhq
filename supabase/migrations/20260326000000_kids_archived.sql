-- Add archived flag to kids table for soft-delete / graduation support
ALTER TABLE kids ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
