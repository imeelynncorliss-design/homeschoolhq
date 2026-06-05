-- Add beta NDA agreement tracking to user_agreements.
--
-- The current agreement/onboarding flow writes beta_nda_confirmed alongside
-- age_confirmed and tos_confirmed. Older schema migrations created
-- user_agreements before the beta NDA field existed, so fresh environments need
-- this forward migration to match the app.

ALTER TABLE public.user_agreements
  ADD COLUMN IF NOT EXISTS beta_nda_confirmed boolean NOT NULL DEFAULT false;
