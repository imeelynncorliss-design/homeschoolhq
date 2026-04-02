-- Add current_hook to kids so parents can note what their child is into right now.
-- Scout uses this to personalise lesson suggestions.
alter table kids
  add column if not exists current_hook text;
