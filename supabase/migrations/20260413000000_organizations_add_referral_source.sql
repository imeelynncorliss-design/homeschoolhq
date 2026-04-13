-- Track signup referral source for beta cohort identification
-- Captured from ?invite= query param at org creation time
-- Query beta cohort: SELECT * FROM organizations WHERE referral_source = 'beta-april2026'

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS referral_source text;
